"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateTeluguNames } from "@/lib/gemini";
import { names } from "@/data/names";
import type { NameEntry } from "@/data/names";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function recordSwipe(name: string, verdict: "like" | "pass") {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("name_swipes")
    .upsert(
      { user_id: user.id, name, verdict },
      { onConflict: "user_id,name" },
    );
  if (error) throw new Error(error.message);

  // No revalidatePath — the deck advances locally; persistence is fire-and-forget.
}

export async function unlikeName(name: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("name_swipes")
    .delete()
    .eq("user_id", user.id)
    .eq("name", name);
  if (error) throw new Error(error.message);
  revalidatePath("/names");
  revalidatePath("/names/favorites");
}

export async function generateMoreNames(): Promise<NameEntry[]> {
  const { supabase, user } = await requireUser();

  const [{ data: swipes }, { data: prevGenerated }] = await Promise.all([
    supabase.from("name_swipes").select("name, verdict"),
    supabase.from("generated_names").select("name"),
  ]);

  const liked = (swipes ?? [])
    .filter((s) => s.verdict === "like")
    .map((s) => s.name);
  const passed = (swipes ?? [])
    .filter((s) => s.verdict === "pass")
    .map((s) => s.name);

  const excluded = [
    ...names.map((n) => n.name),
    ...(swipes ?? []).map((s) => s.name),
    ...(prevGenerated ?? []).map((g) => g.name),
  ];

  const batch = await generateTeluguNames({ count: 20, excluded, liked, passed });
  if (batch.length === 0) return [];

  const { error } = await supabase.from("generated_names").upsert(
    batch.map((n) => ({
      user_id: user.id,
      name: n.name,
      origin: n.origin,
      meaning: n.meaning,
    })),
    { onConflict: "user_id,name" },
  );
  if (error) throw new Error(error.message);

  return batch;
}
