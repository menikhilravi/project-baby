"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
