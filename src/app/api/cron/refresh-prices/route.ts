import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { scrapePrice } from "@/lib/price-scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Pull all non-paused watchers + their items so we can compute target hits.
  const { data: items, error: itemsErr } = await supabase
    .from("gear_items")
    .select("id, target_price, is_target_hit_acknowledged");
  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  const itemTargets = new Map<string, number>();
  const itemAcks = new Map<string, boolean>();
  for (const i of items ?? []) {
    itemTargets.set(i.id, Number(i.target_price));
    itemAcks.set(i.id, i.is_target_hit_acknowledged);
  }

  const { data: watchers, error: wErr } = await supabase
    .from("gear_watchers")
    .select("id, item_id, url, current_price")
    .eq("is_paused", false);
  if (wErr) {
    return NextResponse.json({ error: wErr.message }, { status: 500 });
  }

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

  let okCount = 0;
  let failedCount = 0;
  const newBestByItem = new Map<string, number | null>();

  for (const w of watchers ?? []) {
    const result = await scrapePrice(w.url);
    const now = new Date().toISOString();
    let priceForBest: number | null = w.current_price === null ? null : Number(w.current_price);

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
      priceForBest = result.price;
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

    if (priceForBest !== null) {
      const cur = newBestByItem.get(w.item_id);
      if (cur === undefined || cur === null || priceForBest < cur) {
        newBestByItem.set(w.item_id, priceForBest);
      }
    } else if (!newBestByItem.has(w.item_id)) {
      newBestByItem.set(w.item_id, null);
    }
  }

  // Apply target-hit transitions.
  let targetHits = 0;
  for (const [itemId, target] of itemTargets) {
    const oldBest = oldBestByItem.get(itemId) ?? null;
    const newBest = newBestByItem.get(itemId) ?? null;
    if (newBest === null) continue;

    const wasAbove = oldBest === null ? null : oldBest > target;
    const nowAtOrBelow = newBest <= target;

    const updates: {
      last_target_hit_at?: string;
      is_target_hit_acknowledged?: boolean;
    } = {};

    if (nowAtOrBelow && (wasAbove === true || wasAbove === null)) {
      updates.last_target_hit_at = new Date().toISOString();
      updates.is_target_hit_acknowledged = false;
      targetHits++;
    } else if (newBest > target && itemAcks.get(itemId) === true) {
      updates.is_target_hit_acknowledged = false;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("gear_items").update(updates).eq("id", itemId);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: watchers?.length ?? 0,
    okCount,
    failedCount,
    targetHits,
  });
}
