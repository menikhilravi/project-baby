"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const body = String(formData.get("body") ?? "");
  const { supabase, userId, coupleId } = await ctx();
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: userId, couple_id: coupleId, title, body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  if (data) redirect(`/notes/${data.id}`);
}

export async function updateNote(
  id: number,
  patch: { title?: string; body?: string; pinned?: boolean },
) {
  const { supabase } = await ctx();
  const { error } = await supabase
    .from("notes")
    .update({ ...patch })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
}

export async function deleteNote(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  redirect("/notes");
}
