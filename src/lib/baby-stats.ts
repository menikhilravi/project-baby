/**
 * Pure aggregation helpers over baby_events rows, computed in the viewer's
 * LOCAL timezone (rows are stored UTC). Shared by the /reports dashboard,
 * the weekly summary, and the insights generator.
 */

export type RawEvent = {
  kind: "feed" | "diaper" | "sleep" | "med";
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
  /** Bottle intake for the day, in oz (ml converted). */
  feedOz: number;
  diapers: number;
  pee: number;
  poop: number;
  both: number;
  untyped: number;
  /** Vitamin D doses recorded that day (typically 0 or 1). */
  vitaminD: number;
};

export type RangeStats = {
  days: number;
  avgSleepHours: number;
  avgFeeds: number;
  avgDiapers: number;
  totalFeeds: number;
  totalDiapers: number;
  totalFeedOz: number;
  avgFeedOz: number;
  longestSleepMin: number;
};

const ML_PER_OZ = 29.5735;

/** A feed's volume in oz, if it recorded one (bottle). Null otherwise. */
function feedOz(amount: number | null, unit: string | null): number | null {
  if (amount == null) return null;
  return unit === "ml" ? amount / ML_PER_OZ : amount;
}

/**
 * Split a sleep interval into [localDayKey, minutes] segments at local
 * midnight, so an overnight stretch credits each day it actually covers
 * instead of dumping all of it on the day it began.
 */
function splitSleepByDay(start: Date, end: Date): Array<[string, number]> {
  const segs: Array<[string, number]> = [];
  let cur = new Date(start);
  while (cur < end) {
    const nextMidnight = new Date(cur);
    nextMidnight.setHours(24, 0, 0, 0);
    const segEnd = end < nextMidnight ? end : nextMidnight;
    const min = (segEnd.getTime() - cur.getTime()) / 60_000;
    if (min > 0) segs.push([localDayKey(cur), min]);
    cur = segEnd;
  }
  return segs;
}

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
      feedOz: 0,
      diapers: 0,
      pee: 0,
      poop: 0,
      both: 0,
      untyped: 0,
      vitaminD: 0,
    };
    byDate.set(bucket.date, bucket);
    buckets.push(bucket);
  }

  for (const e of events) {
    const start = new Date(e.occurred_at);
    if (e.kind === "feed") {
      const b = byDate.get(localDayKey(start));
      if (!b) continue;
      b.feeds += 1;
      const oz = feedOz(e.amount, e.unit);
      if (oz != null) b.feedOz += oz;
    } else if (e.kind === "diaper") {
      const b = byDate.get(localDayKey(start));
      if (!b) continue;
      b.diapers += 1;
      if (e.subtype === "pee") b.pee += 1;
      else if (e.subtype === "poop") b.poop += 1;
      else if (e.subtype === "both") b.both += 1;
      else b.untyped += 1;
    } else if (e.kind === "med" && e.subtype === "vitamin_d") {
      const b = byDate.get(localDayKey(start));
      if (b) b.vitaminD += 1;
    } else if (e.kind === "sleep" && e.ended_at) {
      const end = new Date(e.ended_at);
      const fullMin = Math.max(0, (end.getTime() - start.getTime()) / 60_000);
      // Session count + longest-stretch land on the day the sleep began; the
      // hours themselves are split across each local day the sleep covers.
      const startBucket = byDate.get(localDayKey(start));
      if (startBucket) {
        startBucket.sleepSessions += 1;
        startBucket.longestSleepMin = Math.max(
          startBucket.longestSleepMin,
          fullMin,
        );
      }
      for (const [key, min] of splitSleepByDay(start, end)) {
        const b = byDate.get(key);
        if (b) b.sleepHours += min / 60;
      }
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
  const totalFeedOz = buckets.reduce((s, b) => s + b.feedOz, 0);
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
    totalFeedOz,
    avgFeedOz: totalFeedOz / days,
    longestSleepMin,
  };
}

/**
 * Vitamin D adherence over a set of buckets: how many days had a dose, and the
 * current run of consecutive dosed days counting back from the most recent.
 * Today is given grace — if it hasn't been logged yet it doesn't break a streak.
 */
export function vitaminDAdherence(buckets: DayBucket[]): {
  daysGiven: number;
  days: number;
  streak: number;
} {
  const daysGiven = buckets.filter((b) => b.vitaminD > 0).length;
  let streak = 0;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].vitaminD > 0) streak += 1;
    else if (i === buckets.length - 1) continue; // today not logged yet
    else break;
  }
  return { daysGiven, days: buckets.length, streak };
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
