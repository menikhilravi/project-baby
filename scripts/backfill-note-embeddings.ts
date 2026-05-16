/**
 * One-shot script: embed every note that doesn't yet have an embedding.
 *
 * Run from the repo root:
 *   npx tsx --env-file=.env.local scripts/backfill-note-embeddings.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY  (bypasses RLS so we can read/update every note)
 *   - GEMINI_API_KEY
 *
 * Re-running is safe — it only touches notes where embedding IS NULL.
 */

import { createClient } from "@supabase/supabase-js";

// Must match src/lib/embed.ts exactly (model + dims) so vectors are
// comparable to the ones written by createNote / updateNote.
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMS = 768;
const EMBED_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;

async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`${EMBED_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: text.trim().slice(0, 8000) }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    throw new Error(`Embed HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const vec = data.embedding?.values;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("Embed: empty response");
  }
  return vec;
}

function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, body")
    .is("embedding", null);
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  if (!notes || notes.length === 0) {
    console.log("Nothing to backfill — all notes already have embeddings.");
    return;
  }

  console.log(`Backfilling ${notes.length} note${notes.length === 1 ? "" : "s"}…`);
  let ok = 0;
  let failed = 0;
  for (const n of notes) {
    const text = `${n.title}\n\n${n.body ?? ""}`.trim();
    if (!text) {
      console.log(`  · #${n.id} skipped (empty)`);
      continue;
    }
    try {
      const vec = await embed(text);
      const { error: upErr } = await supabase
        .from("notes")
        .update({ embedding: toPgVector(vec) })
        .eq("id", n.id);
      if (upErr) throw new Error(upErr.message);
      console.log(`  ✓ #${n.id} ${n.title.slice(0, 60)}`);
      ok++;
    } catch (e) {
      failed++;
      console.error(`  ✗ #${n.id} failed:`, e instanceof Error ? e.message : e);
    }
    // Gentle pacing — well under Gemini's free-tier QPS but avoids bursts.
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`\nDone. ${ok} embedded, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
