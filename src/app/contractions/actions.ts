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

/** Begin a contraction: insert a row with no end yet. */
export async function startContraction() {
  const { supabase, userId, coupleId, role } = await ctx();
  if (role !== "mom") {
    throw new Error("Only the pregnant user can time contractions");
  }
  const { error } = await supabase
    .from("baby_events")
    .insert({ user_id: userId, couple_id: coupleId, kind: "contraction" });
  if (error) throw new Error(error.message);
  revalidatePath("/contractions");
}

/** End the contraction currently in progress by stamping ended_at. */
export async function stopContraction() {
  const { supabase, userId, coupleId, role } = await ctx();
  if (role !== "mom") {
    throw new Error("Only the pregnant user can time contractions");
  }
  const openQuery = supabase
    .from("baby_events")
    .select("id")
    .eq("kind", "contraction")
    .is("ended_at", null)
    .order("occurred_at", { ascending: false })
    .limit(1);
  // Match the RLS scope: couple row if in a couple, else this user's own.
  const { data: open } = coupleId
    ? await openQuery.eq("couple_id", coupleId).maybeSingle()
    : await openQuery.eq("user_id", userId).maybeSingle();
  if (!open) return;
  const { error } = await supabase
    .from("baby_events")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", open.id);
  if (error) throw new Error(error.message);
  revalidatePath("/contractions");
}

/** Delete a single contraction (mis-tap cleanup). */
export async function deleteContraction(id: number) {
  const { supabase, role } = await ctx();
  if (role !== "mom") {
    throw new Error("Only the pregnant user can edit contractions");
  }
  const { error } = await supabase
    .from("baby_events")
    .delete()
    .eq("id", id)
    .eq("kind", "contraction");
  if (error) throw new Error(error.message);
  revalidatePath("/contractions");
}
