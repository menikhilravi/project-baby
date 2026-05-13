import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Phase } from "./nav";

export type { Phase };

/**
 * Resolution order: explicit override → birth_date vs today → fallback prenatal.
 */
export async function getPhase(): Promise<Phase> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "prenatal";

  const { data } = await supabase
    .from("profiles")
    .select("birth_date, phase_override")
    .eq("id", user.id)
    .single();

  if (data?.phase_override) return data.phase_override;
  if (data?.birth_date && data.birth_date <= new Date().toISOString().slice(0, 10)) {
    return "postnatal";
  }
  return "prenatal";
}
