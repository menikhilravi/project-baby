import "server-only";

/**
 * Thin wrapper around Gemini's text-embedding-004 model (768-dim).
 * Used by notes hybrid search — server-only because it needs GEMINI_API_KEY.
 */

const EMBED_MODEL = "text-embedding-004";
const EMBED_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

type EmbedResponse = { embedding?: { values?: number[] } };

export async function embedText(
  text: string,
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (and Vercel env vars for prod).",
    );
  }
  const input = text.trim().slice(0, 8000);
  if (!input) throw new Error("embedText: empty input");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${EMBED_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: input }] },
        taskType,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Embed request failed: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Embed HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as EmbedResponse;
  const vec = data.embedding?.values;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("Embed: empty response");
  }
  return vec;
}

/**
 * Format a vector array for pgvector. Postgres accepts the literal
 * "[1,2,3]" form via PostgREST.
 */
export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Best-effort embed: swallows errors and returns null. Use when saving a note
 * — we never want embedding failure to block the user's write.
 */
export async function tryEmbed(
  text: string,
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<string | null> {
  try {
    const v = await embedText(text, taskType);
    return toPgVector(v);
  } catch (e) {
    console.error("[embed] failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
