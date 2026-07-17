import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Phase } from "./nav";

export type { Phase };

/**
 * Pure phase resolver so callers that already hold a profile row don't need a
 * second query. Resolution order: explicit override → birth_date vs today →
 * fallback prenatal.
 */
export function derivePhase(
  row:
    | { birth_date: string | null; phase_override: Phase | null }
    | null
    | undefined,
): Phase {
  if (row?.phase_override) return row.phase_override;
  if (
    row?.birth_date &&
    row.birth_date <= new Date().toISOString().slice(0, 10)
  ) {
    return "postnatal";
  }
  return "prenatal";
}

export async function getPhase(): Promise<Phase> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return "prenatal";

  const { data } = await supabase
    .from("profiles")
    .select("birth_date, phase_override")
    .eq("id", userId)
    .single();

  return derivePhase(data);
}
