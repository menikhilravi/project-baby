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

/** Scope filter matching a couple's shared rows (or a solo user's own). */
function scope<T extends { eq: (c: string, v: string) => T }>(
  query: T,
  coupleId: string | null,
  userId: string,
): T {
  return coupleId
    ? query.eq("couple_id", coupleId)
    : query.eq("user_id", userId);
}

/** Record or clear a single immunization dose. */
export async function setVaccineDose(
  vaccine: string,
  dose: string,
  given: boolean,
  givenOn?: string,
) {
  const { supabase, userId, coupleId } = await ctx();
  if (given) {
    const { error } = await supabase.from("vaccine_doses").upsert(
      {
        user_id: userId,
        couple_id: coupleId,
        vaccine,
        dose,
        given_on: givenOn ?? new Date().toISOString().slice(0, 10),
      },
      { onConflict: coupleId ? "couple_id,vaccine,dose" : "user_id,vaccine,dose" },
    );
    if (error) throw new Error(error.message);
  } else {
    const del = supabase
      .from("vaccine_doses")
      .delete()
      .eq("vaccine", vaccine)
      .eq("dose", dose);
    const { error } = await scope(del, coupleId, userId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/checkups");
}

export type VisitInput = {
  /** Schedule slug for well-visits; null/omitted for a custom appointment. */
  slug?: string | null;
  title: string;
  scheduledFor: string;
  location?: string | null;
  notes?: string | null;
  completed?: boolean;
};

/**
 * Create or update an appointment. Well-visits are keyed by their schedule
 * `slug` (one per baby); custom appointments always insert a new row.
 */
export async function upsertVisit(input: VisitInput) {
  const { supabase, userId, coupleId } = await ctx();
  const completedAt = input.completed ? new Date().toISOString() : null;

  if (input.slug) {
    const find = supabase
      .from("appointments")
      .select("id")
      .eq("slug", input.slug);
    const { data: existing } = await scope(find, coupleId, userId).maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("appointments")
        .update({
          title: input.title,
          scheduled_for: input.scheduledFor,
          location: input.location ?? null,
          notes: input.notes ?? null,
          completed_at: completedAt,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      revalidatePath("/checkups");
      return;
    }
  }

  const { error } = await supabase.from("appointments").insert({
    user_id: userId,
    couple_id: coupleId,
    slug: input.slug ?? null,
    title: input.title,
    scheduled_for: input.scheduledFor,
    location: input.location ?? null,
    notes: input.notes ?? null,
    completed_at: completedAt,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/checkups");
}

export async function deleteAppointment(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/checkups");
}
