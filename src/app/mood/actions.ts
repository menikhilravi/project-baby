"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  EPDS_QUESTIONS,
  SELF_HARM_INDEX,
  scoreEpds,
} from "@/lib/epds";

/** Record a completed EPDS check-in for the current user. */
export async function submitMoodCheckin(answers: number[], note?: string) {
  if (
    !Array.isArray(answers) ||
    answers.length !== EPDS_QUESTIONS.length ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)
  ) {
    throw new Error("Please answer every question.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("mood_checkins").insert({
    user_id: user.id,
    score: scoreEpds(answers),
    answers,
    self_harm: answers[SELF_HARM_INDEX] ?? 0,
    note: note?.trim() ? note.trim() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/mood");
}

export async function deleteMoodCheckin(id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase
    .from("mood_checkins")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/mood");
}
