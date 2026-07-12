"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventDetail } from "@/lib/baby-events";
import type { EventKind } from "@/lib/kind-meta";

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

export async function logEvent(
  kind: "feed" | "diaper",
  detail?: EventDetail,
) {
  const { supabase, userId, coupleId } = await ctx();
  // Instant feeds (bottle / solid / typeless) are zero-duration, so we stamp
  // ended_at = occurred_at. That keeps `ended_at IS NULL` reserved for a
  // nursing session that's still in progress (see startNursing).
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind,
    subtype: detail?.subtype ?? null,
    amount: detail?.amount ?? null,
    unit: detail?.unit ?? null,
    occurred_at: nowIso,
    ended_at: kind === "feed" ? nowIso : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
}

/** Log a temperature reading (°F or °C). Powers the fever alert on /today. */
export async function logTemp(amount: number, unit: "f" | "c") {
  const { supabase, userId, coupleId } = await ctx();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind: "temp",
    amount,
    unit,
    occurred_at: nowIso,
    ended_at: nowIso,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
}

/** Log a dose given. `amount`/`unit` optional (e.g. Vitamin D 400 iu). */
export async function logMed(detail: EventDetail) {
  const { supabase, userId, coupleId } = await ctx();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind: "med",
    subtype: detail.subtype ?? "other",
    amount: detail.amount ?? null,
    unit: detail.unit ?? null,
    occurred_at: nowIso,
    ended_at: nowIso,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
}

/** Log expressed milk from a pumping session (amount + side). */
export async function logPump(
  amount: number,
  unit: "oz" | "ml",
  side: "left" | "right" | "both",
) {
  const { supabase, userId, coupleId } = await ctx();
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind: "pump",
    subtype: side,
    amount,
    unit,
    occurred_at: nowIso,
    ended_at: nowIso,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
}

/** Log a tummy-time session of `minutes` (stored as occurred_at → ended_at). */
export async function logTummy(minutes: number) {
  const { supabase, userId, coupleId } = await ctx();
  const start = new Date();
  const end = new Date(start.getTime() + minutes * 60_000);
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind: "tummy",
    occurred_at: start.toISOString(),
    ended_at: end.toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
}

/**
 * Start a timed nursing session on a side. The open-nursing unique index
 * (migration 0025) guarantees only one runs at a time per couple/solo user;
 * if one is already open we switch sides by closing it first.
 */
export async function startNursing(side: "left" | "right") {
  const { supabase, userId, coupleId } = await ctx();
  await stopNursing();
  const { error } = await supabase.from("baby_events").insert({
    user_id: userId,
    couple_id: coupleId,
    kind: "feed",
    subtype: side,
    ended_at: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
}

/** Close the open nursing session, if any. No-op when nothing is running. */
export async function stopNursing() {
  const { supabase, userId, coupleId } = await ctx();
  const openQuery = supabase
    .from("baby_events")
    .select("id")
    .eq("kind", "feed")
    .is("ended_at", null)
    .limit(1);
  if (coupleId) openQuery.eq("couple_id", coupleId);
  else openQuery.eq("user_id", userId);
  const { data: open } = await openQuery.maybeSingle();
  if (!open) return;
  const { error } = await supabase
    .from("baby_events")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", open.id);
  if (error) throw new Error(error.message);
  revalidatePath("/log");
  revalidatePath("/today");
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
  revalidatePath("/today");
}

export async function removeEvent(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("baby_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/log", "layout");
  revalidatePath("/today");
}

export type CreateEventInput = {
  kind: EventKind;
  /** ISO timestamp — may be in the past (backfilled log). */
  occurred_at: string;
  ended_at?: string | null;
  subtype?: string | null;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
};

/**
 * Insert an event at an explicit (possibly past) time. Generalizes the
 * now-only quick-log helpers so a missed log can be back-filled from the
 * detail page. Instant kinds stamp ended_at = occurred_at unless the caller
 * supplies a real end (nursing / sleep / tummy durations).
 */
export async function createEventAt(input: CreateEventInput) {
  const { supabase, userId, coupleId } = await ctx();
  const endedAt =
    input.ended_at !== undefined
      ? input.ended_at
      : input.kind === "sleep"
        ? null
        : input.occurred_at;
  const { data, error } = await supabase
    .from("baby_events")
    .insert({
      user_id: userId,
      couple_id: coupleId,
      kind: input.kind,
      subtype: input.subtype ?? null,
      amount: input.amount ?? null,
      unit: input.unit ?? null,
      occurred_at: input.occurred_at,
      ended_at: endedAt,
      notes: input.notes ?? null,
    })
    .select(
      "id, user_id, couple_id, kind, subtype, amount, unit, occurred_at, ended_at, notes",
    )
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/log/${input.kind}`);
  revalidatePath("/today");
  return data;
}

export type UpdateEventInput = {
  occurred_at?: string;
  ended_at?: string | null;
  subtype?: string | null;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
};

/**
 * Patch an existing event — fixing a mistyped detail or an off timestamp.
 * Couple/RLS scoping is enforced by the row-level policies; we only send the
 * fields the caller actually changed.
 */
export async function updateEvent(id: number, patch: UpdateEventInput) {
  const { supabase } = await ctx();
  const fields: {
    occurred_at?: string;
    ended_at?: string | null;
    subtype?: string | null;
    amount?: number | null;
    unit?: string | null;
    notes?: string | null;
  } = {};
  if (patch.occurred_at !== undefined) fields.occurred_at = patch.occurred_at;
  if (patch.ended_at !== undefined) fields.ended_at = patch.ended_at;
  if (patch.subtype !== undefined) fields.subtype = patch.subtype;
  if (patch.amount !== undefined) fields.amount = patch.amount;
  if (patch.unit !== undefined) fields.unit = patch.unit;
  if (patch.notes !== undefined) fields.notes = patch.notes;
  if (Object.keys(fields).length === 0) return null;

  const { data, error } = await supabase
    .from("baby_events")
    .update(fields)
    .eq("id", id)
    .select(
      "id, user_id, couple_id, kind, subtype, amount, unit, occurred_at, ended_at, notes",
    )
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/log", "layout");
  revalidatePath("/today");
  return data;
}
