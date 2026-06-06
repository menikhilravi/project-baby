/**
 * Pure aggregation helpers over baby_events rows, computed in the viewer's
 * LOCAL timezone (rows are stored UTC). Shared by the /reports dashboard,
 * the weekly summary, and the insights generator.
 */

export type RawEvent = {
  kind: "feed" | "diaper" | "sleep";
  subtype: string | null;
  amount: number | null;
  unit: string | null;
  occurred_at: string;
  ended_at: string | null;
};

export type DayBucket = {
  /** Local YYYY-MM-DD. */
  date: string;
  /** Short x-axis label, e.g. "6/3". */
  label: string;
  /** Weekday, e.g. "Mon". */
  weekday: string;
  sleepHours: number;
  sleepSessions: number;
  longestSleepMin: number;
  feeds: number;
  diapers: number;
  pee: number;
  poop: number;
  both: number;
  untyped: number;
};

export type RangeStats = {
  days: number;
  avgSleepHours: number;
  avgFeeds: number;
  avgDiapers: number;
  totalFeeds: number;
  totalDiapers: number;
  longestSleepMin: number;
};

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build `days` ordered buckets (oldest → today) in local time. */
export function dayBuckets(
  events: RawEvent[],
  days: number,
  now: Date = new Date(),
): DayBucket[] {
  const buckets: DayBucket[] = [];
  const byDate = new Map<string, DayBucket>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const bucket: DayBucket = {
      date: localDayKey(d),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      sleepHours: 0,
      sleepSessions: 0,
      longestSleepMin: 0,
      feeds: 0,
      diapers: 0,
      pee: 0,
      poop: 0,
      both: 0,
      untyped: 0,
    };
    byDate.set(bucket.date, bucket);
    buckets.push(bucket);
  }

  for (const e of events) {
    const start = new Date(e.occurred_at);
    const b = byDate.get(localDayKey(start));
    if (!b) continue;
    if (e.kind === "feed") {
      b.feeds += 1;
    } else if (e.kind === "diaper") {
      b.diapers += 1;
      if (e.subtype === "pee") b.pee += 1;
      else if (e.subtype === "poop") b.poop += 1;
      else if (e.subtype === "both") b.both += 1;
      else b.untyped += 1;
    } else if (e.kind === "sleep" && e.ended_at) {
      const min = Math.max(
        0,
        (new Date(e.ended_at).getTime() - start.getTime()) / 60_000,
      );
      b.sleepHours += min / 60;
      b.sleepSessions += 1;
      b.longestSleepMin = Math.max(b.longestSleepMin, min);
    }
  }

  return buckets;
}

/** Roll a set of buckets into headline averages/totals. */
export function rangeStats(buckets: DayBucket[]): RangeStats {
  const days = buckets.length || 1;
  const totalSleep = buckets.reduce((s, b) => s + b.sleepHours, 0);
  const totalFeeds = buckets.reduce((s, b) => s + b.feeds, 0);
  const totalDiapers = buckets.reduce((s, b) => s + b.diapers, 0);
  const longestSleepMin = buckets.reduce(
    (m, b) => Math.max(m, b.longestSleepMin),
    0,
  );
  return {
    days,
    avgSleepHours: totalSleep / days,
    avgFeeds: totalFeeds / days,
    avgDiapers: totalDiapers / days,
    totalFeeds,
    totalDiapers,
    longestSleepMin,
  };
}

/** Count of feeds started in each local hour (0–23) over the last `days`. */
export function feedHourHistogram(
  events: RawEvent[],
  days: number,
  now: Date = new Date(),
): number[] {
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const hours = new Array(24).fill(0) as number[];
  for (const e of events) {
    if (e.kind !== "feed") continue;
    const d = new Date(e.occurred_at);
    if (d < cutoff) continue;
    hours[d.getHours()] += 1;
  }
  return hours;
}

/** Format minutes as "Xh Ym" / "Ym". */
export function formatDuration(min: number): string {
  const rounded = Math.round(min);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
