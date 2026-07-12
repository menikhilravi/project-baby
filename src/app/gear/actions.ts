"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scrapePrice } from "@/lib/price-scraper";
import { detectRetailer } from "@/lib/retailer";

// Shortlist gear_items are surfaced inline on /nursery, so any watcher
// change has to invalidate both pages.
function revalidateGearAndNursery() {
  revalidatePath("/gear");
  revalidatePath("/nursery");
}

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

function asInt(v: FormDataEntryValue | null, min = 0): number {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n < min) throw new Error("Invalid number");
  return n;
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

  const kindInput = String(formData.get("kind") ?? "registry");
  const kind: "registry" | "shortlist" =
    kindInput === "shortlist" ? "shortlist" : "registry";

  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  const url = String(formData.get("url") ?? "").trim();

  // Registry items need a target price and a starting URL. Shortlist items
  // are just a parent for candidate URLs added later — both are optional.
  let target_price: number | null = null;
  if (kind === "registry") {
    target_price = asPositiveNumber(formData.get("target_price"));
    if (!isValidUrl(url)) throw new Error("Enter a valid product URL");
  } else if (url && !isValidUrl(url)) {
    throw new Error("Enter a valid product URL");
  }

  const nurseryIdRaw = formData.get("nursery_item_id");
  const nursery_item_id =
    nurseryIdRaw !== null && String(nurseryIdRaw).trim() !== ""
      ? parseInt(String(nurseryIdRaw), 10)
      : null;

  const coupleId = await getUserCoupleId(supabase, user.id);
  const { data: item, error: itemErr } = await supabase
    .from("gear_items")
    .insert({
      user_id: user.id,
      couple_id: coupleId,
      name,
      emoji,
      target_price,
      kind,
      nursery_item_id,
    })
    .select("id")
    .single();
  if (itemErr || !item) throw new Error(itemErr?.message ?? "Failed to add");

  if (url) {
    await createWatcherAndScrape(item.id, url);
  }

  revalidateGearAndNursery();
}

// ---------------------------------------------------------------------------
// Supplies (consumables)
// ---------------------------------------------------------------------------

export async function addSupplyItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const emoji = String(formData.get("emoji") ?? "").trim() || "📦";
  const quantity = asInt(formData.get("quantity"));
  const low_threshold = asInt(formData.get("low_threshold"));

  const coupleId = await getUserCoupleId(supabase, user.id);
  const { error } = await supabase.from("gear_items").insert({
    user_id: user.id,
    couple_id: coupleId,
    name,
    emoji,
    kind: "supplies",
    quantity,
    low_threshold,
    target_price: null,
  });
  if (error) throw new Error(error.message);
  revalidateGearAndNursery();
}

export async function adjustSupplyQuantity(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const delta = parseInt(String(formData.get("delta") ?? "0"), 10);
  if (!id || !Number.isFinite(delta) || delta === 0) {
    throw new Error("Invalid adjustment");
  }
  const { data: item } = await supabase
    .from("gear_items")
    .select("quantity, kind")
    .eq("id", id)
    .maybeSingle();
  if (!item || item.kind !== "supplies") throw new Error("Not a supply item");
  const next = Math.max(0, item.quantity + delta);
  const { error } = await supabase
    .from("gear_items")
    .update({ quantity: next })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGearAndNursery();
}

export async function updateSupply(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const patch: { quantity?: number; low_threshold?: number; name?: string } = {};
  const q = formData.get("quantity");
  if (q !== null) patch.quantity = asInt(q);
  const t = formData.get("low_threshold");
  if (t !== null) patch.low_threshold = asInt(t);
  const name = formData.get("name");
  if (name !== null) {
    const s = String(name).trim();
    if (s) patch.name = s;
  }
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase
    .from("gear_items")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGearAndNursery();
}

// ---------------------------------------------------------------------------
// Item lifecycle (shared)
// ---------------------------------------------------------------------------

export async function removeGearItem(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("gear_items")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGearAndNursery();
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
  revalidateGearAndNursery();
}

// ---------------------------------------------------------------------------
// Watcher lifecycle
// ---------------------------------------------------------------------------

export async function addWatcher(formData: FormData) {
  const { supabase } = await requireUser();
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
  revalidateGearAndNursery();
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
  revalidateGearAndNursery();
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
  revalidateGearAndNursery();
}

// ---------------------------------------------------------------------------
// Candidate selection + ordering
// ---------------------------------------------------------------------------

export async function setChosenWatcher(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const { data: target } = await supabase
    .from("gear_watchers")
    .select("item_id, is_chosen")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new Error("Watcher not found");

  // Toggle: if already chosen, unset; else clear siblings then set this one.
  if (target.is_chosen) {
    const { error } = await supabase
      .from("gear_watchers")
      .update({ is_chosen: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    // Clear siblings first to satisfy the partial unique index.
    const { error: clearErr } = await supabase
      .from("gear_watchers")
      .update({ is_chosen: false })
      .eq("item_id", target.item_id)
      .eq("is_chosen", true);
    if (clearErr) throw new Error(clearErr.message);

    const { error: setErr } = await supabase
      .from("gear_watchers")
      .update({ is_chosen: true })
      .eq("id", id);
    if (setErr) throw new Error(setErr.message);
  }

  revalidateGearAndNursery();
}

export async function reorderWatcher(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id) throw new Error("Missing id");
  if (direction !== "up" && direction !== "down") {
    throw new Error("Invalid direction");
  }

  const { data: current } = await supabase
    .from("gear_watchers")
    .select("item_id, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!current) throw new Error("Watcher not found");

  // Find the immediate neighbor in the requested direction.
  const base = supabase
    .from("gear_watchers")
    .select("id, sort_order")
    .eq("item_id", current.item_id);
  const neighborRes = await (direction === "up"
    ? base
        .lt("sort_order", current.sort_order)
        .order("sort_order", { ascending: false })
    : base
        .gt("sort_order", current.sort_order)
        .order("sort_order", { ascending: true })
  )
    .limit(1)
    .maybeSingle();
  const neighbor = neighborRes.data;

  if (!neighbor) return; // already at the edge

  // Swap sort_order values.
  const { error: e1 } = await supabase
    .from("gear_watchers")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase
    .from("gear_watchers")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);
  if (e2) throw new Error(e2.message);

  revalidateGearAndNursery();
}

// ---------------------------------------------------------------------------
// Refresh + target-hit
// ---------------------------------------------------------------------------

export async function refreshUserPrices() {
  const { supabase } = await requireUser();

  const { data: items } = await supabase
    .from("gear_items")
    .select("id, target_price");

  if (!items?.length) {
    revalidateGearAndNursery();
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
          title: result.title ?? null,
          image_url: result.image ?? null,
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

  revalidateGearAndNursery();
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
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const { error } = await supabase
    .from("gear_items")
    .update({ is_target_hit_acknowledged: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGearAndNursery();
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function createWatcherAndScrape(itemId: string, url: string) {
  const supabase = (await requireUser()).supabase;
  const retailer = detectRetailer(url);

  // Append to the end of the per-item ordered list.
  const { data: last } = await supabase
    .from("gear_watchers")
    .select("sort_order")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? 0) + 1;

  const { data: w, error: insErr } = await supabase
    .from("gear_watchers")
    .insert({
      item_id: itemId,
      retailer,
      url,
      last_checked_status: "pending",
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (insErr || !w) throw new Error(insErr?.message ?? "Failed to add watcher");

  // Scrape on a best-effort basis. We never want a scraper hiccup to fail
  // the whole action — the watcher row is already saved and the user can
  // always set the price manually.
  let result: Awaited<ReturnType<typeof scrapePrice>>;
  try {
    result = await scrapePrice(url);
  } catch (e) {
    result = {
      ok: false,
      error: e instanceof Error ? e.message : "Scrape threw unexpectedly",
    };
  }
  const now = new Date().toISOString();
  if (result.ok) {
    await supabase
      .from("gear_watchers")
      .update({
        current_price: result.price,
        last_checked_at: now,
        last_checked_status: "ok",
        last_error: null,
        title: result.title ?? null,
        image_url: result.image ?? null,
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
