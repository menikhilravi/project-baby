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
    .select("couple_id, role")
    .eq("id", user.id)
    .single();
  return {
    supabase,
    userId: user.id,
    coupleId: profile?.couple_id ?? null,
    role: profile?.role ?? null,
  };
}

export async function logKick() {
  const { supabase, userId, coupleId, role } = await ctx();
  if (role !== "mom") {
    throw new Error("Only the pregnant user can log kicks");
  }
  const { error } = await supabase
    .from("baby_events")
    .insert({ user_id: userId, couple_id: coupleId, kind: "kick" });
  if (error) throw new Error(error.message);
  revalidatePath("/kicks");
  revalidatePath("/today");
}

export async function undoLastKick() {
  const { supabase, userId, role } = await ctx();
  if (role !== "mom") {
    throw new Error("Only the pregnant user can log kicks");
  }
  // Bound undo to the last 5 minutes so we never reach back further than
  // the user could reasonably remember the tap.
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: latest } = await supabase
    .from("baby_events")
    .select("id")
    .eq("kind", "kick")
    .eq("user_id", userId)
    .gte("occurred_at", fiveMinutesAgo)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return;
  const { error } = await supabase
    .from("baby_events")
    .delete()
    .eq("id", latest.id);
  if (error) throw new Error(error.message);
  revalidatePath("/kicks");
  revalidatePath("/today");
}
