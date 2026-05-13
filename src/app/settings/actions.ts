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

  const birth_date = birthRaw === "" ? null : birthRaw;
  const phase_override =
    overrideRaw === "prenatal" || overrideRaw === "postnatal"
      ? overrideRaw
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({ birth_date, phase_override })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
