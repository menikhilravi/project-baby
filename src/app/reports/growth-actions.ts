"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();
  return { supabase, userId: user.id, coupleId: profile?.couple_id ?? null };
}

export type GrowthInput = {
  measured_on: string;
  weight_g?: number | null;
  height_cm?: number | null;
  head_cm?: number | null;
};

export async function addMeasurement(input: GrowthInput) {
  const { supabase, userId, coupleId } = await ctx();
  if (
    input.weight_g == null &&
    input.height_cm == null &&
    input.head_cm == null
  ) {
    throw new Error("Enter at least one measurement.");
  }
  const { error } = await supabase.from("growth_measurements").insert({
    user_id: userId,
    couple_id: coupleId,
    measured_on: input.measured_on,
    weight_g: input.weight_g ?? null,
    height_cm: input.height_cm ?? null,
    head_cm: input.head_cm ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
}

/** Persist the baby's sex on the profile (drives the WHO curve selection). */
export async function setBabySex(sex: "male" | "female") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase
    .from("profiles")
    .update({ baby_sex: sex })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
}

export async function removeMeasurement(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase
    .from("growth_measurements")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
}

/** Record a "first" — stored as a baby_events milestone (label in notes). */
export async function addMilestone(label: string, occurredOn: string) {
  const { supabase, userId, coupleId } = await ctx();
  const clean = label.trim();
  if (!clean) throw new Error("Add a short description.");
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind: "milestone",
    notes: clean,
    occurred_at: new Date(`${occurredOn}T12:00:00`).toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
}

export async function removeMilestone(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("baby_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/reports");
}
