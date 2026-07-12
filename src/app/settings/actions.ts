"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updatePhase(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const overrideRaw = String(formData.get("phase_override") ?? "").trim();
  const sexRaw = String(formData.get("baby_sex") ?? "").trim();
  const weightRaw = String(formData.get("birth_weight_g") ?? "").trim();

  const birth_date = birthRaw === "" ? null : birthRaw;
  const phase_override =
    overrideRaw === "prenatal" || overrideRaw === "postnatal"
      ? overrideRaw
      : null;
  const baby_sex =
    sexRaw === "male" || sexRaw === "female" ? sexRaw : null;
  const parsedWeight = weightRaw === "" ? null : Number(weightRaw);
  const birth_weight_g =
    parsedWeight != null && Number.isFinite(parsedWeight) && parsedWeight > 0
      ? parsedWeight
      : null;

  const { data, error } = await supabase
    .from("profiles")
    .update({ birth_date, phase_override, baby_sex, birth_weight_g })
    .eq("id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "Profile row not updated — check that migration 0010 ran and that the profiles RLS update policy is active.",
    );
  }

  revalidatePath("/", "layout");
}

export async function updateHiddenSections(hidden: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const cleaned = Array.from(new Set(hidden.map((s) => s.trim()).filter(Boolean)));

  const { data, error } = await supabase
    .from("profiles")
    .update({ hidden_sections: cleaned })
    .eq("id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Profile row not updated.");
  }

  revalidatePath("/", "layout");
}
