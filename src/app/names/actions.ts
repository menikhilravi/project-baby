"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
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

  let rank: number | null = null;
  if (verdict === "like") {
    const { data: top } = await supabase
      .from("name_swipes")
      .select("rank")
      .eq("user_id", user.id)
      .eq("verdict", "like")
      .order("rank", { ascending: false })
      .limit(1)
      .maybeSingle();
    rank = (top?.rank ?? 0) + 1;
  }

  const { error } = await supabase
    .from("name_swipes")
    .upsert(
      { user_id: user.id, name, verdict, rank },
      { onConflict: "user_id,name" },
    );
  if (error) throw new Error(error.message);

  // Revalidate so the favorites count badge refreshes without a full navigation.
  revalidatePath("/names");
}

export async function reorderFavorite(name: string, direction: "up" | "down") {
  const { supabase, user } = await requireUser();

  const { data: current } = await supabase
    .from("name_swipes")
    .select("rank")
    .eq("user_id", user.id)
    .eq("name", name)
    .eq("verdict", "like")
    .single();

  if (!current?.rank) return;

  const adjacentRank = direction === "up" ? current.rank - 1 : current.rank + 1;

  const { data: neighbor } = await supabase
    .from("name_swipes")
    .select("name, rank")
    .eq("user_id", user.id)
    .eq("verdict", "like")
    .eq("rank", adjacentRank)
    .maybeSingle();

  if (!neighbor) return;

  await supabase
    .from("name_swipes")
    .update({ rank: adjacentRank })
    .eq("user_id", user.id)
    .eq("name", name);

  await supabase
    .from("name_swipes")
    .update({ rank: current.rank })
    .eq("user_id", user.id)
    .eq("name", neighbor.name);

  revalidatePath("/names/favorites");
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

// ── Couple mode ─────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export type CoupleStatus = {
  inviteCode: string;
  partnerId: string | null;
  partnerEmail: string | null;
};

export async function getCoupleStatus(): Promise<CoupleStatus | null> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (!profile?.couple_id) return null;

  const { data: couple } = await supabase
    .from("couples")
    .select("invite_code")
    .eq("id", profile.couple_id)
    .single();

  if (!couple) return null;

  const admin = createServiceClient();
  const { data: members } = await admin
    .from("profiles")
    .select("id, email")
    .eq("couple_id", profile.couple_id);

  const partner = (members ?? []).find((m) => m.id !== user.id) ?? null;

  return {
    inviteCode: couple.invite_code,
    partnerId: partner?.id ?? null,
    partnerEmail: partner?.email ?? null,
  };
}

export async function createCouple(): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (profile?.couple_id) throw new Error("Already in a couple");

  const { data: couple, error } = await supabase
    .from("couples")
    .insert({ invite_code: generateInviteCode() })
    .select()
    .single();

  if (error || !couple) throw new Error(error?.message ?? "Failed to create couple");

  await supabase
    .from("profiles")
    .update({ couple_id: couple.id })
    .eq("id", user.id);

  // Backfill existing items so pre-couple data is also shared.
  await Promise.all([
    supabase
      .from("gear_items")
      .update({ couple_id: couple.id })
      .eq("user_id", user.id)
      .is("couple_id", null),
    supabase
      .from("hospital_checklist")
      .update({ couple_id: couple.id })
      .eq("user_id", user.id)
      .is("couple_id", null),
  ]);

  revalidatePath("/names/couple");
}

export async function joinCouple(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const code = (formData.get("code") as string | null)?.trim().toUpperCase();
  if (!code) throw new Error("Code is required");

  const admin = createServiceClient();
  const { data: couple } = await admin
    .from("couples")
    .select("id")
    .eq("invite_code", code)
    .single();

  if (!couple) throw new Error("Invalid invite code");

  const { error } = await supabase
    .from("profiles")
    .update({ couple_id: couple.id })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  // Backfill this user's existing items into the shared couple pool.
  await Promise.all([
    supabase
      .from("gear_items")
      .update({ couple_id: couple.id })
      .eq("user_id", user.id)
      .is("couple_id", null),
    supabase
      .from("hospital_checklist")
      .update({ couple_id: couple.id })
      .eq("user_id", user.id)
      .is("couple_id", null),
  ]);

  revalidatePath("/names/couple");
  revalidatePath("/names/favorites");
  revalidatePath("/gear");
  revalidatePath("/hospital");
}
