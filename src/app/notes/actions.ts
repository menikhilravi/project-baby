"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tryEmbed } from "@/lib/embed";

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

function embedInput(title: string, body: string): string {
  return `${title}\n\n${body}`.trim();
}

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const body = String(formData.get("body") ?? "");
  const { supabase, userId, coupleId } = await ctx();
  const embedding = await tryEmbed(embedInput(title, body));
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      couple_id: coupleId,
      title,
      body,
      ...(embedding ? { embedding } : {}),
    })
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
  // Re-embed only when title or body changed — pin-toggle stays cheap.
  const textChanged = patch.title !== undefined || patch.body !== undefined;
  let embedding: string | null = null;
  if (textChanged) {
    const { data: current } = await supabase
      .from("notes")
      .select("title, body")
      .eq("id", id)
      .single();
    if (current) {
      const nextTitle = patch.title ?? current.title;
      const nextBody = patch.body ?? current.body;
      embedding = await tryEmbed(embedInput(nextTitle, nextBody));
    }
  }
  const { error } = await supabase
    .from("notes")
    .update({
      ...patch,
      ...(textChanged && embedding ? { embedding } : {}),
    })
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
