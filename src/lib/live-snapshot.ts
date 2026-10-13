import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { countsFor, toLiveEvent, type LiveSnapshot } from "@/lib/live-state";

/**
 * The handful of small queries behind the live state. Runs on the server for
 * /today (seeding SSR) and in the browser for every other page (so the
 * quick-log sheet and header mascot know what's going on). RLS scopes rows
 * to the couple.
 */
export async function fetchLiveSnapshot(
  supabase: SupabaseClient<Database>,
  nowMs: number = Date.now(),
): Promise<LiveSnapshot> {
  const since = new Date(nowMs - 30 * 60 * 60_000).toISOString();
  const [recentRes, openSleepRes, lastWakeRes, lastBreastRes, lastFeedRes, lastDiaperRes] =
    await Promise.all([
      supabase
        .from("baby_events")
        .select("id, kind, subtype, amount, unit, occurred_at, ended_at")
        .in("kind", ["feed", "diaper"])
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("baby_events")
        .select("id, occurred_at")
        .eq("kind", "sleep")
        .is("ended_at", null)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("ended_at")
        .eq("kind", "sleep")
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("subtype")
        .eq("kind", "feed")
        .not("ended_at", "is", null)
        .in("subtype", ["left", "right"])
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("occurred_at")
        .eq("kind", "feed")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("occurred_at")
        .eq("kind", "diaper")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const recent = (recentRes.data ?? []).map(toLiveEvent);
  const open = recent.find(
    (e) => e.kind === "feed" && e.ended_at === null && (e.subtype === "left" || e.subtype === "right"),
  );

  return {
    recent,
    openSleep: openSleepRes.data
      ? { id: openSleepRes.data.id, occurred_at: openSleepRes.data.occurred_at }
      : null,
    openNursing: open
      ? { id: open.id, side: open.subtype as "left" | "right", occurred_at: open.occurred_at }
      : null,
    lastBreastSide: (lastBreastRes.data?.subtype as "left" | "right" | undefined) ?? null,
    lastFeedAt: lastFeedRes.data?.occurred_at ?? null,
    lastDiaperAt: lastDiaperRes.data?.occurred_at ?? null,
    lastWakeAt: lastWakeRes.data?.ended_at ?? null,
    serverNow: nowMs,
    serverCounts: countsFor(recent, nowMs),
  };
}
