import "server-only";

/**
 * Minimal Gemini client. Uses the REST endpoint directly to avoid an
 * extra SDK dependency.
 *
 * Get an API key: https://aistudio.google.com/apikey (free tier is plenty
 * for a two-person app).
 */

const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type GeneratedNameEntry = {
  name: string;
  origin: string;
  meaning: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

export async function generateTeluguNames(opts: {
  count: number;
  excluded: string[];
  liked: string[];
  passed: string[];
}): Promise<GeneratedNameEntry[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (and Vercel env vars for prod).",
    );
  }

  const { count, excluded, liked, passed } = opts;

  const prompt = buildPrompt({ count, excluded, liked, passed });

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.95,
      topP: 0.9,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            origin: { type: "STRING" },
            meaning: { type: "STRING" },
          },
          required: ["name", "origin", "meaning"],
        },
      },
    },
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini request failed: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not an array");
  }

  const seen = new Set(excluded.map(normalize));
  const out: GeneratedNameEntry[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : null;
    const origin = typeof entry.origin === "string" ? entry.origin.trim() : null;
    const meaning =
      typeof entry.meaning === "string" ? entry.meaning.trim() : null;
    if (!name || !origin || !meaning) continue;
    if (seen.has(normalize(name))) continue;
    seen.add(normalize(name));
    out.push({ name, origin, meaning });
  }
  return out;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function buildPrompt({
  count,
  excluded,
  liked,
  passed,
}: {
  count: number;
  excluded: string[];
  liked: string[];
  passed: string[];
}): string {
  const tasteBlock =
    liked.length > 0 || passed.length > 0
      ? `\n\nUser's taste so far (lean toward similar phonetics / aesthetics to LIKED, away from PASSED):\nLIKED: ${liked.join(", ") || "(none yet)"}\nPASSED: ${passed.join(", ") || "(none yet)"}`
      : "";

  return `You are helping a Telugu-speaking couple in India pick a name for their baby. The baby's gender is unknown, so produce a mix of names suitable for boys, girls, and gender-neutral options.

Generate exactly ${count} baby name suggestions. For each, return:
- name: the romanized spelling (e.g., "Aarav", "Lakshmi", "Vihaan")
- origin: one of "Telugu", "Sanskrit", or "Sanskrit-origin Telugu"
- meaning: a short, evocative description (≤ 60 characters), e.g., "Lotus flower", "Pole star, steadfast"

Rules:
- Names must feel authentic to a Telugu/South Indian household. Mix classical Telugu names, Sanskrit-origin names common in Telugu families, and contemporary Indian variants. Avoid generic Western names.
- Do NOT include any of these names (they've already been shown to the user):\n${excluded.length ? excluded.join(", ") : "(none yet)"}
- Balance: aim for roughly equal male / female / gender-neutral.
- No duplicates within this batch.
- Each name must be distinct in initial letter or sound where possible to feel varied.${tasteBlock}

Return ONLY the JSON array — no preamble, no markdown, no commentary.`;
}
