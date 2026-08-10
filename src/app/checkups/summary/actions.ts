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

const MAX_LENGTH = 300;

export async function addVisitQuestion(question: string): Promise<void> {
  const text = question.trim();
  if (!text) throw new Error("Write a question first.");
  const { supabase, userId, coupleId } = await ctx();
  const { error } = await supabase.from("visit_questions").insert({
    user_id: userId,
    couple_id: coupleId,
    question: text.slice(0, MAX_LENGTH),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/checkups/summary");
}

/** Tick a question off (asked at the visit) or put it back on the list. */
export async function setVisitQuestionAsked(
  id: number,
  asked: boolean,
): Promise<void> {
  const { supabase, userId, coupleId } = await ctx();
  const update = supabase
    .from("visit_questions")
    .update({ asked_at: asked ? new Date().toISOString() : null })
    .eq("id", id);
  const { error } = await scope(update, coupleId, userId);
  if (error) throw new Error(error.message);
  revalidatePath("/checkups/summary");
}

export async function removeVisitQuestion(id: number): Promise<void> {
  const { supabase, userId, coupleId } = await ctx();
  const del = supabase.from("visit_questions").delete().eq("id", id);
  const { error } = await scope(del, coupleId, userId);
  if (error) throw new Error(error.message);
  revalidatePath("/checkups/summary");
}
