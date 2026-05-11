"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scrapePrice } from "@/lib/price-scraper";
import { detectRetailer } from "@/lib/retailer";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

async function getUserCoupleId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", userId)
    .single();
  return data?.couple_id ?? null;
}

function asPositiveNumber(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? ""));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid number");
  return Math.round(n * 100) / 100;
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Item lifecycle
// ---------------------------------------------------------------------------

export async function addGearItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  const target_price = asPositiveNumber(formData.get("target_price"));
  const url = String(formData.get("url") ?? "").trim();
  if (!isValidUrl(url)) throw new Error("Enter a valid product URL");

  const coupleId = await getUserCoupleId(supabase, user.id);
  const { data: item, error: itemErr } = await supabase
    .from("gear_items")
    .insert({ user_id: user.id, couple_id: coupleId, name, emoji, target_price })
    .select("id")
    .single();
  if (itemErr || !item) throw new Error(itemErr?.message ?? "Failed to add");

  await createWatcherAndScrape(item.id, url);

  revalidatePath("/gear");
}

export async function removeGearItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("gear_items")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/gear");
}

export async function updateGearItemTarget(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const target_price = asPositiveNumber(formData.get("target_price"));
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("gear_items")
    .update({ target_price })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/gear");
}

// ---------------------------------------------------------------------------
// Watcher lifecycle
// ---------------------------------------------------------------------------

export async function addWatcher(formData: FormData) {
  const { supabase, user } = await requireUser();
  const itemId = String(formData.get("item_id") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  if (!itemId) throw new Error("Missing item_id");
  if (!isValidUrl(url)) throw new Error("Enter a valid product URL");

  // Authorize via RLS: user must be able to see the item (own or couple's).
  const { data: item } = await supabase
    .from("gear_items")
    .select("id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) throw new Error("Item not found");

  await createWatcherAndScrape(itemId, url);

  // Recompute target hit (in case the new watcher's price is below target).
  await recomputeTargetHit(itemId);
  revalidatePath("/gear");
}

export async function removeWatcher(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("gear_watchers")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/gear");
}

export async function setWatcherPriceManual(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const price = asPositiveNumber(formData.get("price"));
  if (!id) throw new Error("Missing id");

  const { data: w } = await supabase
    .from("gear_watchers")
    .select("item_id")
    .eq("id", id)
    .maybeSingle();
  if (!w) throw new Error("Watcher not found");

  const { error } = await supabase
    .from("gear_watchers")
    .update({
      current_price: price,
      last_checked_at: new Date().toISOString(),
      last_checked_status: "ok",
      last_error: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await recomputeTargetHit(w.item_id);
  revalidatePath("/gear");
}

// ---------------------------------------------------------------------------
// Refresh + target-hit
// ---------------------------------------------------------------------------

export async function refreshUserPrices() {
  const { supabase, user } = await requireUser();

  const { data: items } = await supabase
    .from("gear_items")
    .select("id, target_price");

  if (!items?.length) {
    revalidatePath("/gear");
    return { scanned: 0, ok: 0, failed: 0 };
  }

  const itemIds = items.map((i) => i.id);

  const { data: watchers } = await supabase
    .from("gear_watchers")
    .select("id, item_id, url, current_price, is_paused")
    .in("item_id", itemIds)
    .eq("is_paused", false);

  let okCount = 0;
  let failedCount = 0;

  // Track per-item old best for transition detection.
  const oldBestByItem = new Map<string, number | null>();
  for (const w of watchers ?? []) {
    const cur = oldBestByItem.get(w.item_id);
    if (w.current_price !== null) {
      const p = Number(w.current_price);
      if (cur === undefined || cur === null || p < cur) {
        oldBestByItem.set(w.item_id, p);
      }
    } else if (cur === undefined) {
      oldBestByItem.set(w.item_id, null);
    }
  }

  for (const w of watchers ?? []) {
    const result = await scrapePrice(w.url);
    const now = new Date().toISOString();
    if (result.ok) {
      await supabase
        .from("gear_watchers")
        .update({
          current_price: result.price,
          last_checked_at: now,
          last_checked_status: "ok",
          last_error: null,
        })
        .eq("id", w.id);
      okCount++;
    } else {
      await supabase
        .from("gear_watchers")
        .update({
          last_checked_at: now,
          last_checked_status: "failed",
          last_error: result.error,
        })
        .eq("id", w.id);
      failedCount++;
    }
  }

  // Compute new best per item, fire target-hit when transitioning down.
  for (const item of items) {
    await recomputeTargetHit(item.id, oldBestByItem.get(item.id) ?? null);
  }

  revalidatePath("/gear");
  return { scanned: watchers?.length ?? 0, ok: okCount, failed: failedCount };
}

/**
 * Recompute best price for an item and update target-hit state.
 * If oldBest is provided and represents the prior best, we'll only fire
 * `last_target_hit_at` when transitioning from above-target to at-or-below.
 * Otherwise we just align state with the current best.
 */
async function recomputeTargetHit(
  itemId: string,
  oldBest?: number | null,
) {
  const { supabase } = await requireUser();

  const { data: item } = await supabase
    .from("gear_items")
    .select("target_price, last_target_hit_at, is_target_hit_acknowledged")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return;

  const { data: ws } = await supabase
    .from("gear_watchers")
    .select("current_price, is_paused")
    .eq("item_id", itemId);

  let newBest: number | null = null;
  for (const w of ws ?? []) {
    if (w.is_paused || w.current_price === null) continue;
    const p = Number(w.current_price);
    if (newBest === null || p < newBest) newBest = p;
  }

  const target = Number(item.target_price);
  const wasAbove =
    oldBest === undefined ? null : oldBest === null ? null : oldBest > target;
  const nowAtOrBelow = newBest !== null && newBest <= target;

  const updates: {
    last_target_hit_at?: string | null;
    is_target_hit_acknowledged?: boolean;
  } = {};

  if (nowAtOrBelow && (wasAbove === true || wasAbove === null)) {
    // Transitioned to (or first reached) target.
    updates.last_target_hit_at = new Date().toISOString();
    updates.is_target_hit_acknowledged = false;
  } else if (newBest !== null && newBest > target) {
    // Re-arm so a future drop fires another alert.
    if (item.is_target_hit_acknowledged) {
      updates.is_target_hit_acknowledged = false;
    }
  }

  if (Object.keys(updates).length === 0) return;
  await supabase.from("gear_items").update(updates).eq("id", itemId);
}

export async function acknowledgeTargetHit(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("gear_items")
    .update({ is_target_hit_acknowledged: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/gear");
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function createWatcherAndScrape(itemId: string, url: string) {
  const supabase = (await requireUser()).supabase;
  const retailer = detectRetailer(url);

  const { data: w, error: insErr } = await supabase
    .from("gear_watchers")
    .insert({
      item_id: itemId,
      retailer,
      url,
      last_checked_status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !w) throw new Error(insErr?.message ?? "Failed to add watcher");

  const result = await scrapePrice(url);
  const now = new Date().toISOString();
  if (result.ok) {
    await supabase
      .from("gear_watchers")
      .update({
        current_price: result.price,
        last_checked_at: now,
        last_checked_status: "ok",
        last_error: null,
      })
      .eq("id", w.id);
  } else {
    await supabase
      .from("gear_watchers")
      .update({
        last_checked_at: now,
        last_checked_status: "failed",
        last_error: result.error,
      })
      .eq("id", w.id);
  }
}
