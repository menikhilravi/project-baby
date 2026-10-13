import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Write the baby's sex / name to every profile in the caller's couple (RPCs
 * from migration 0034). If the migration hasn't been applied yet the RPC is
 * missing; fall back to the caller's own row so the old behaviour holds.
 */
export async function setCoupleBabySex(
  supabase: Supabase,
  userId: string,
  sex: "male" | "female" | null,
) {
  const { error } = await supabase.rpc("set_couple_baby_sex", { p_sex: sex });
  if (!error) return;
  const { error: fallback } = await supabase
    .from("profiles")
    .update({ baby_sex: sex })
    .eq("id", userId);
  if (fallback) throw new Error(fallback.message);
}

export async function setCoupleBabyName(supabase: Supabase, name: string | null) {
  const clean = name?.trim().slice(0, 40) || null;
  const { error } = await supabase.rpc("set_couple_baby_name", { p_name: clean });
  // Missing function (migration 0034 not applied) — the name simply isn't
  // stored yet; everything else on the form still saves.
  if (error && !/function|schema cache/i.test(error.message)) {
    throw new Error(error.message);
  }
}
