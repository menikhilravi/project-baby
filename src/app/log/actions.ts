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

export async function logEvent(kind: "feed" | "diaper") {
  const { supabase, userId, coupleId } = await ctx();
  const { error } = await supabase
    .from("baby_events")
    .insert({ user_id: userId, couple_id: coupleId, kind });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
}

export async function toggleSleep() {
  const { supabase, userId, coupleId } = await ctx();
  const openQuery = supabase
    .from("baby_events")
    .select("id")
    .eq("kind", "sleep")
    .is("ended_at", null)
    .limit(1);
  if (coupleId) openQuery.eq("couple_id", coupleId);
  else openQuery.eq("user_id", userId);
  const { data: open } = await openQuery.maybeSingle();

  if (open) {
    const { error } = await supabase
      .from("baby_events")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", open.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("baby_events")
      .insert({ user_id: userId, couple_id: coupleId, kind: "sleep" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/log");
}

export async function removeEvent(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("baby_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/log");
}
