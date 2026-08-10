/**
 * Pure aggregation for the pediatrician visit summary: everything that
 * happened between the last visit and the next one, rolled into the numbers a
 * doctor actually asks about.
 *
 * Unlike `baby-stats` (anchored to "the last N days"), this works over an
 * arbitrary [from, to] window in the viewer's LOCAL timezone. Rows are stored
 * UTC, so callers fetch with a day of buffer on each side and let this module
 * do the local-day bucketing.
 *
 * Nothing here reads the clock or the DB — callers pass `now`. Not medical
 * advice: every reference range is a widely-published average, surfaced to
 * make the conversation easier, never to replace it.
 */

import { localDayKey } from "./baby-stats";
import { medLabel } from "./baby-events";
import {
  ageInDays,
  classifyTemp,
  diaperGuidance,
  tallyDiapers,
  toFahrenheit,
  type TempStatus,
} from "./newborn-health";
import { valueToCentile } from "./growth-percentiles";
import type { WhoSex } from "./who-growth";

const DAY_MS = 24 * 60 * 60 * 1000;
const ML_PER_OZ = 29.5735;

/** Night = 7pm–7am local, for the day/night sleep split. */
const NIGHT_START_H = 19;
const NIGHT_END_H = 7;
/** "Night feed" window — 10pm–6am, the stretch parents mean by "up at night". */
const NIGHT_FEED_START_H = 22;
const NIGHT_FEED_END_H = 6;

/** A nursing session longer than this is a forgotten timer, not a feed. */
const MAX_NURSING_MIN = 180;

export type SummaryEvent = {
  kind: string;
  subtype: string | null;
  amount: number | null;
  unit: string | null;
  occurred_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type Measurement = {
  /** Local date, YYYY-MM-DD. */
  measured_on: string;
  weight_g: number | null;
  height_cm: number | null;
  head_cm: number | null;
};

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

export type VisitWindow = {
  /** Last visit — local YYYY-MM-DD, inclusive. */
  from: string;
  /** Next visit — local YYYY-MM-DD, inclusive. */
  to: string;
  /** `to` clamped to today: the last day that can actually hold data. */
  through: string;
  /** Inclusive day count of [from, through]. Always ≥ 1. */
  days: number;
  /** Days left until the visit; 0 once it arrives. */
  daysUntilVisit: number;
  /** Age in days at each end, when the birth date is known. */
  ageDaysAtFrom: number | null;
  ageDaysAtVisit: number | null;
};

function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

/** Whole days from local day `a` to local day `b` (negative if b is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (dateFromKey(b).getTime() - dateFromKey(a).getTime()) / DAY_MS,
  );
}

export function buildWindow(
  from: string,
  to: string,
  birthDate: string | null,
  now: Date,
): VisitWindow {
  const today = localDayKey(now);
  // Data can only exist up to today, but a window that hasn't started yet
  // still needs `through >= from` so the day list is never inverted.
  const through = to < today ? to : today < from ? from : today;
  const daysUntilVisit = Math.max(0, daysBetween(today, to));
  return {
    from,
    to,
    through,
    days: Math.max(1, daysBetween(from, through) + 1),
    daysUntilVisit,
    ageDaysAtFrom: birthDate
      ? ageInDays(birthDate, endOfDay(dateFromKey(from)))
      : null,
    ageDaysAtVisit: birthDate
      ? ageInDays(birthDate, endOfDay(dateFromKey(to)))
      : null,
  };
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Every local day key in [from, through], oldest first. */
export function dayKeysBetween(from: string, through: string): string[] {
  const keys: string[] = [];
  const cur = dateFromKey(from);
  const end = dateFromKey(through);
  // Guard against a pathological range blowing up the page.
  for (let i = 0; cur <= end && i < 800; i++) {
    keys.push(localDayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Per-day buckets
// ---------------------------------------------------------------------------

export type VisitDay = {
  date: string;
  /** Short x-axis label, e.g. "6/3". */
  label: string;
  feeds: number;
  nightFeeds: number;
  /** Volume recorded on feeds that carried an amount (bottles), in oz. */
  bottleOz: number;
  nursingMin: number;
  wet: number;
  dirty: number;
  diapers: number;
  sleepHours: number;
  nightSleepHours: number;
  sleepSessions: number;
  longestSleepMin: number;
  tummyMin: number;
  pumpOz: number;
  vitaminD: number;
  /** True once anything at all was logged that day. */
  hasData: boolean;
};

function emptyDay(date: string): VisitDay {
  const d = dateFromKey(date);
  return {
    date,
    label: `${d.getMonth() + 1}/${d.getDate()}`,
    feeds: 0,
    nightFeeds: 0,
    bottleOz: 0,
    nursingMin: 0,
    wet: 0,
    dirty: 0,
    diapers: 0,
    sleepHours: 0,
    nightSleepHours: 0,
    sleepSessions: 0,
    longestSleepMin: 0,
    tummyMin: 0,
    pumpOz: 0,
    vitaminD: 0,
    hasData: false,
  };
}

function toOz(amount: number | null, unit: string | null): number {
  if (amount == null) return 0;
  return unit === "ml" ? amount / ML_PER_OZ : amount;
}

function overlapMin(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): number {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  return end > start ? (end - start) / 60_000 : 0;
}

function atHour(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Split a sleep interval into per-local-day segments, each carrying its total
 * minutes and the share that fell inside the night window. An overnight
 * stretch therefore credits both days it actually covers.
 */
function splitSleep(
  start: Date,
  end: Date,
): Array<{ day: string; min: number; nightMin: number }> {
  const out: Array<{ day: string; min: number; nightMin: number }> = [];
  let cur = new Date(start);
  // Cap the walk so a corrupt row can't spin here.
  for (let i = 0; cur < end && i < 40; i++) {
    const nextMidnight = new Date(cur);
    nextMidnight.setHours(24, 0, 0, 0);
    const segEnd = end < nextMidnight ? end : nextMidnight;
    const min = (segEnd.getTime() - cur.getTime()) / 60_000;
    if (min > 0) {
      const dayStart = new Date(cur);
      dayStart.setHours(0, 0, 0, 0);
      const nightMin =
        overlapMin(cur, segEnd, dayStart, atHour(dayStart, NIGHT_END_H)) +
        overlapMin(cur, segEnd, atHour(dayStart, NIGHT_START_H), nextMidnight);
      out.push({ day: localDayKey(cur), min, nightMin });
    }
    cur = segEnd;
  }
  return out;
}

function isNightFeedHour(h: number): boolean {
  return h >= NIGHT_FEED_START_H || h < NIGHT_FEED_END_H;
}

/** Bucket every event in the window into its local day. */
export function visitDays(
  events: SummaryEvent[],
  w: VisitWindow,
): VisitDay[] {
  const keys = dayKeysBetween(w.from, w.through);
  const byDate = new Map<string, VisitDay>();
  const days = keys.map((k) => {
    const day = emptyDay(k);
    byDate.set(k, day);
    return day;
  });

  for (const e of events) {
    const start = new Date(e.occurred_at);
    if (Number.isNaN(start.getTime())) continue;
    const bucket = byDate.get(localDayKey(start));

    if (e.kind === "sleep" && e.ended_at) {
      // Sleep is the one kind that can land on a day other than its start,
      // so it resolves its own buckets below rather than using `bucket`.
      const end = new Date(e.ended_at);
      const fullMin = Math.max(0, (end.getTime() - start.getTime()) / 60_000);
      if (bucket) {
        bucket.hasData = true;
        bucket.sleepSessions += 1;
        bucket.longestSleepMin = Math.max(bucket.longestSleepMin, fullMin);
      }
      for (const seg of splitSleep(start, end)) {
        const b = byDate.get(seg.day);
        if (!b) continue;
        b.hasData = true;
        b.sleepHours += seg.min / 60;
        b.nightSleepHours += seg.nightMin / 60;
      }
      continue;
    }

    if (!bucket) continue;

    switch (e.kind) {
      case "feed": {
        bucket.hasData = true;
        bucket.feeds += 1;
        if (isNightFeedHour(start.getHours())) bucket.nightFeeds += 1;
        bucket.bottleOz += toOz(e.amount, e.unit);
        if ((e.subtype === "left" || e.subtype === "right") && e.ended_at) {
          const min =
            (new Date(e.ended_at).getTime() - start.getTime()) / 60_000;
          if (min > 0 && min <= MAX_NURSING_MIN) bucket.nursingMin += min;
        }
        break;
      }
      case "diaper": {
        bucket.hasData = true;
        bucket.diapers += 1;
        const t = tallyDiapers([e]);
        bucket.wet += t.wet;
        bucket.dirty += t.dirty;
        break;
      }
      case "tummy": {
        if (!e.ended_at) break;
        const min = (new Date(e.ended_at).getTime() - start.getTime()) / 60_000;
        if (min > 0) {
          bucket.hasData = true;
          bucket.tummyMin += min;
        }
        break;
      }
      case "pump": {
        bucket.hasData = true;
        bucket.pumpOz += toOz(e.amount, e.unit);
        break;
      }
      case "med": {
        bucket.hasData = true;
        if (e.subtype === "vitamin_d") bucket.vitaminD += 1;
        break;
      }
      case "temp":
      case "milestone":
        bucket.hasData = true;
        break;
    }
  }

  return days;
}

/** Events whose start falls inside [from, through] in local time. */
function inWindow(
  events: SummaryEvent[],
  w: VisitWindow,
  kind: string,
): SummaryEvent[] {
  return events.filter((e) => {
    if (e.kind !== kind) return false;
    const key = localDayKey(new Date(e.occurred_at));
    return key >= w.from && key <= w.through;
  });
}

// ---------------------------------------------------------------------------
// Section summaries
// ---------------------------------------------------------------------------

export type FeedingSummary = {
  totalFeeds: number;
  perDay: number;
  nursingSessions: number;
  nursingMinTotal: number;
  /** Mean length of a timed nursing session. Null when none were timed. */
  avgNursingMin: number | null;
  bottleFeeds: number;
  solidFeeds: number;
  totalOz: number;
  ozPerDay: number;
  sideSplit: { left: number; right: number };
  /** Median gap between consecutive feeds — uncapped, unlike the predictor. */
  medianIntervalMin: number | null;
  longestGapMin: number | null;
  longestGapAt: string | null;
  nightFeedsPerDay: number;
  /** Feeds/day over the first vs second half of the window. */
  trend: { first: number; second: number } | null;
};

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function feedingSummary(
  events: SummaryEvent[],
  w: VisitWindow,
  days: VisitDay[],
): FeedingSummary {
  const feeds = inWindow(events, w, "feed").sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at),
  );
  const totalFeeds = feeds.length;

  let nursingSessions = 0;
  let nursingMinTotal = 0;
  let left = 0;
  let right = 0;
  let bottleFeeds = 0;
  let solidFeeds = 0;
  for (const f of feeds) {
    if (f.subtype === "left" || f.subtype === "right") {
      if (f.subtype === "left") left += 1;
      else right += 1;
      if (f.ended_at) {
        const min =
          (new Date(f.ended_at).getTime() -
            new Date(f.occurred_at).getTime()) /
          60_000;
        if (min > 0 && min <= MAX_NURSING_MIN) {
          nursingSessions += 1;
          nursingMinTotal += min;
        }
      }
    } else if (f.subtype === "bottle") bottleFeeds += 1;
    else if (f.subtype === "solid") solidFeeds += 1;
  }

  // Gaps between consecutive feeds.
  const gaps: Array<{ min: number; at: string }> = [];
  for (let i = 1; i < feeds.length; i++) {
    const prev = new Date(feeds[i - 1].occurred_at).getTime();
    const cur = new Date(feeds[i].occurred_at).getTime();
    const min = (cur - prev) / 60_000;
    if (min > 0) gaps.push({ min, at: feeds[i - 1].occurred_at });
  }
  const longest = gaps.reduce<{ min: number; at: string } | null>(
    (best, g) => (best == null || g.min > best.min ? g : best),
    null,
  );

  const totalOz = days.reduce((s, d) => s + d.bottleOz, 0);
  const nightFeeds = days.reduce((s, d) => s + d.nightFeeds, 0);

  // Trend needs a window long enough to have two meaningful halves.
  let trend: FeedingSummary["trend"] = null;
  if (days.length >= 6) {
    const half = Math.floor(days.length / 2);
    const firstHalf = days.slice(0, half);
    const secondHalf = days.slice(days.length - half);
    trend = {
      first: firstHalf.reduce((s, d) => s + d.feeds, 0) / half,
      second: secondHalf.reduce((s, d) => s + d.feeds, 0) / half,
    };
  }

  return {
    totalFeeds,
    perDay: totalFeeds / w.days,
    nursingSessions,
    nursingMinTotal,
    avgNursingMin: nursingSessions > 0 ? nursingMinTotal / nursingSessions : null,
    bottleFeeds,
    solidFeeds,
    totalOz,
    ozPerDay: totalOz / w.days,
    sideSplit: { left, right },
    medianIntervalMin:
      gaps.length >= 2
        ? Math.round(median(gaps.map((g) => g.min).sort((a, b) => a - b)))
        : null,
    longestGapMin: longest ? Math.round(longest.min) : null,
    longestGapAt: longest?.at ?? null,
    nightFeedsPerDay: nightFeeds / w.days,
    trend,
  };
}

export type DiaperSummary = {
  total: number;
  wetPerDay: number;
  dirtyPerDay: number;
  /** Days with diapers logged that still fell under the age target. */
  daysBelowTarget: number;
  /** Days with at least one diaper logged — the denominator above. */
  loggedDays: number;
  /** The steady-state target used at the end of the window. */
  targetWet: number;
  targetDirty: number;
};

function diaperSummary(
  days: VisitDay[],
  w: VisitWindow,
  birthDate: string | null,
  today: string,
): DiaperSummary {
  let total = 0;
  let wet = 0;
  let dirty = 0;
  let loggedDays = 0;
  let daysBelowTarget = 0;

  for (const d of days) {
    total += d.diapers;
    wet += d.wet;
    dirty += d.dirty;
    if (d.diapers === 0) continue;
    loggedDays += 1;
    // Today is still accumulating — judging it as "below target" would be
    // wrong at 9am. Same grace the Today card gives.
    if (d.date === today) continue;
    const g = diaperGuidance(
      { wet: d.wet, dirty: d.dirty },
      birthDate,
      // Noon avoids DST edges when deriving the day of life.
      atHour(dateFromKey(d.date), 12),
    );
    if (!g.wetMet || !g.dirtyMet) daysBelowTarget += 1;
  }

  const last = diaperGuidance(
    { wet: 0, dirty: 0 },
    birthDate,
    atHour(dateFromKey(w.through), 12),
  );

  return {
    total,
    wetPerDay: wet / w.days,
    dirtyPerDay: dirty / w.days,
    daysBelowTarget,
    loggedDays,
    targetWet: last.targetWet,
    targetDirty: last.targetDirty,
  };
}

export type SleepSummary = {
  avgHoursPerDay: number;
  nightHoursPerDay: number;
  dayHoursPerDay: number;
  /** Single best stretch in the whole window. */
  longestStretchMin: number;
  /** Mean of each day's best stretch, over days with sleep logged. */
  avgLongestStretchMin: number | null;
  sessionsPerDay: number;
  loggedDays: number;
};

function sleepSummary(days: VisitDay[], w: VisitWindow): SleepSummary {
  const withSleep = days.filter((d) => d.sleepSessions > 0);
  const totalHours = days.reduce((s, d) => s + d.sleepHours, 0);
  const nightHours = days.reduce((s, d) => s + d.nightSleepHours, 0);
  return {
    avgHoursPerDay: totalHours / w.days,
    nightHoursPerDay: nightHours / w.days,
    dayHoursPerDay: (totalHours - nightHours) / w.days,
    longestStretchMin: days.reduce((m, d) => Math.max(m, d.longestSleepMin), 0),
    avgLongestStretchMin:
      withSleep.length > 0
        ? withSleep.reduce((s, d) => s + d.longestSleepMin, 0) / withSleep.length
        : null,
    sessionsPerDay: days.reduce((s, d) => s + d.sleepSessions, 0) / w.days,
    loggedDays: withSleep.length,
  };
}

export type GrowthSummary = {
  /** Latest measurement on or before the window opened — the "last visit" row. */
  baseline: Measurement | null;
  /** Latest measurement in the window. */
  latest: Measurement | null;
  inWindow: Measurement[];
  weightGainG: number | null;
  weightGainGPerDay: number | null;
  weightGainSpanDays: number | null;
  lengthGainCm: number | null;
  headGainCm: number | null;
  centiles: {
    weight: number | null;
    height: number | null;
    head: number | null;
  } | null;
  /** Published average daily gain for the baby's age, for context only. */
  expectedGain: { low: number; high: number; label: string } | null;
};

/**
 * Average daily weight gain by age — the "is she gaining enough" reference a
 * pediatrician works from. Widely published AAP/WHO averages; ranges are
 * approximate and individual babies vary.
 */
export function expectedGainGPerDay(
  ageDays: number | null,
): { low: number; high: number; label: string } | null {
  if (ageDays == null || ageDays < 0) return null;
  if (ageDays < 90) return { low: 20, high: 30, label: "0–3 months" };
  if (ageDays < 180) return { low: 15, high: 21, label: "3–6 months" };
  if (ageDays < 270) return { low: 10, high: 13, label: "6–9 months" };
  if (ageDays < 365) return { low: 6, high: 11, label: "9–12 months" };
  return null;
}

function growthSummary(
  measurements: Measurement[],
  w: VisitWindow,
  birthDate: string | null,
  sex: WhoSex | null,
): GrowthSummary {
  const sorted = [...measurements].sort((a, b) =>
    a.measured_on.localeCompare(b.measured_on),
  );
  const before = sorted.filter((m) => m.measured_on <= w.from);
  const within = sorted.filter(
    (m) => m.measured_on > w.from && m.measured_on <= w.through,
  );
  const baseline = before.length > 0 ? before[before.length - 1] : null;
  const latest = within.length > 0 ? within[within.length - 1] : baseline;

  /**
   * Gain is measured from the last reading before the window (the weigh-in at
   * the previous visit). When there isn't one — the very first visit, or a
   * hand-picked range — fall back to the earliest reading *inside* the window,
   * which still gives a real interval as long as there are two of them.
   */
  const pair = (key: "weight_g" | "height_cm" | "head_cm") => {
    const has = (m: Measurement) => m[key] != null;
    const withinVals = within.filter(has);
    const end = withinVals.length > 0 ? withinVals[withinVals.length - 1] : null;
    const start =
      [...before].reverse().find(has) ??
      (withinVals.length >= 2 ? withinVals[0] : null);
    if (!start || !end || start === end) return null;
    return { start, end, delta: (end[key] as number) - (start[key] as number) };
  };

  const weightPair = pair("weight_g");
  let weightGainG: number | null = null;
  let weightGainGPerDay: number | null = null;
  let weightGainSpanDays: number | null = null;
  if (weightPair) {
    const span = daysBetween(
      weightPair.start.measured_on,
      weightPair.end.measured_on,
    );
    weightGainG = weightPair.delta;
    weightGainSpanDays = span;
    if (span > 0) weightGainGPerDay = weightGainG / span;
  }

  let centiles: GrowthSummary["centiles"] = null;
  if (latest && sex && birthDate) {
    const ageMonths =
      daysBetween(birthDate, latest.measured_on) / 30.4375;
    centiles = {
      weight:
        latest.weight_g != null
          ? valueToCentile("weight", sex, ageMonths, latest.weight_g / 1000)
          : null,
      height:
        latest.height_cm != null
          ? valueToCentile("height", sex, ageMonths, latest.height_cm)
          : null,
      head:
        latest.head_cm != null
          ? valueToCentile("head", sex, ageMonths, latest.head_cm)
          : null,
    };
  }

  return {
    baseline,
    latest,
    inWindow: within,
    weightGainG,
    weightGainGPerDay,
    weightGainSpanDays,
    lengthGainCm: pair("height_cm")?.delta ?? null,
    headGainCm: pair("head_cm")?.delta ?? null,
    centiles,
    expectedGain: expectedGainGPerDay(w.ageDaysAtVisit),
  };
}

export type TempReadingRow = {
  at: string;
  fahrenheit: number;
  status: TempStatus;
};

export type TempSummary = {
  readings: TempReadingRow[];
  maxF: number | null;
  feverCount: number;
  /** Fever or too-cold — the readings worth mentioning out loud. */
  flaggedCount: number;
};

function tempSummary(events: SummaryEvent[], w: VisitWindow): TempSummary {
  const readings = inWindow(events, w, "temp")
    .filter((e) => e.amount != null)
    .map((e) => {
      const reading = {
        amount: e.amount as number,
        unit: e.unit === "c" ? ("c" as const) : ("f" as const),
      };
      return {
        at: e.occurred_at,
        fahrenheit: Math.round(toFahrenheit(reading) * 10) / 10,
        status: classifyTemp(reading),
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    readings,
    maxF: readings.reduce<number | null>(
      (m, r) => (m == null || r.fahrenheit > m ? r.fahrenheit : m),
      null,
    ),
    feverCount: readings.filter((r) => r.status === "fever").length,
    flaggedCount: readings.filter(
      (r) => r.status === "fever" || r.status === "low",
    ).length,
  };
}

export type MedsSummary = {
  vitaminD: { daysGiven: number; days: number; pct: number };
  others: Array<{
    subtype: string;
    label: string;
    count: number;
    lastAt: string;
  }>;
};

function medsSummary(
  events: SummaryEvent[],
  w: VisitWindow,
  days: VisitDay[],
): MedsSummary {
  const meds = inWindow(events, w, "med");
  const byType = new Map<string, { count: number; lastAt: string }>();
  for (const m of meds) {
    if (m.subtype === "vitamin_d") continue;
    const key = m.subtype ?? "other";
    const cur = byType.get(key);
    if (!cur) byType.set(key, { count: 1, lastAt: m.occurred_at });
    else {
      cur.count += 1;
      if (m.occurred_at > cur.lastAt) cur.lastAt = m.occurred_at;
    }
  }

  const daysGiven = days.filter((d) => d.vitaminD > 0).length;
  return {
    vitaminD: {
      daysGiven,
      days: w.days,
      pct: w.days > 0 ? Math.round((daysGiven / w.days) * 100) : 0,
    },
    others: [...byType.entries()]
      .map(([subtype, v]) => ({
        subtype,
        label: medLabel(subtype),
        count: v.count,
        lastAt: v.lastAt,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

export type ActivitySummary = {
  tummyTotalMin: number;
  tummyPerDay: number;
  tummyDays: number;
  pumpSessions: number;
  pumpOz: number;
  pumpOzPerDay: number;
};

function activitySummary(
  events: SummaryEvent[],
  w: VisitWindow,
  days: VisitDay[],
): ActivitySummary {
  const tummyTotalMin = days.reduce((s, d) => s + d.tummyMin, 0);
  const pumpOz = days.reduce((s, d) => s + d.pumpOz, 0);
  return {
    tummyTotalMin,
    tummyPerDay: tummyTotalMin / w.days,
    tummyDays: days.filter((d) => d.tummyMin > 0).length,
    pumpSessions: inWindow(events, w, "pump").length,
    pumpOz,
    pumpOzPerDay: pumpOz / w.days,
  };
}

export type MilestoneEntry = { at: string; label: string };

// ---------------------------------------------------------------------------
// Top level
// ---------------------------------------------------------------------------

export type VisitSummary = {
  window: VisitWindow;
  days: VisitDay[];
  /** Days in the window with anything at all logged. */
  loggedDays: number;
  feeding: FeedingSummary;
  diapers: DiaperSummary;
  sleep: SleepSummary;
  growth: GrowthSummary;
  temps: TempSummary;
  meds: MedsSummary;
  activity: ActivitySummary;
  milestones: MilestoneEntry[];
  /** True when there's essentially nothing to report. */
  isEmpty: boolean;
};

export function buildVisitSummary(input: {
  events: SummaryEvent[];
  measurements: Measurement[];
  window: VisitWindow;
  birthDate: string | null;
  babySex: WhoSex | null;
  now: Date;
}): VisitSummary {
  const { events, measurements, window: w, birthDate, babySex, now } = input;
  const days = visitDays(events, w);
  const today = localDayKey(now);

  const feeding = feedingSummary(events, w, days);
  const diapers = diaperSummary(days, w, birthDate, today);
  const sleep = sleepSummary(days, w);

  const milestones: MilestoneEntry[] = inWindow(events, w, "milestone")
    .map((e) => ({ at: e.occurred_at, label: e.notes?.trim() || "Milestone" }))
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    window: w,
    days,
    loggedDays: days.filter((d) => d.hasData).length,
    feeding,
    diapers,
    sleep,
    growth: growthSummary(measurements, w, birthDate, babySex),
    temps: tempSummary(events, w),
    meds: medsSummary(events, w, days),
    activity: activitySummary(events, w, days),
    milestones,
    isEmpty:
      feeding.totalFeeds === 0 &&
      diapers.total === 0 &&
      sleep.loggedDays === 0 &&
      milestones.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "6 weeks", "3 months, 5 days", "9 days" — how parents say a baby's age. */
export function ageLabel(birthDate: string | null, onDate: string): string | null {
  if (!birthDate) return null;
  const days = daysBetween(birthDate, onDate);
  if (days < 0) return null;
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"} old`;
  if (days < 60) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    return rem === 0
      ? `${weeks} weeks old`
      : `${weeks} weeks, ${rem} ${rem === 1 ? "day" : "days"} old`;
  }
  const months = Math.floor(days / 30.4375);
  const remDays = Math.round(days - months * 30.4375);
  return remDays === 0
    ? `${months} months old`
    : `${months} months, ${remDays} ${remDays === 1 ? "day" : "days"} old`;
}

/** "Jun 3" / "Jun 3, 2026" when the year differs from `now`. */
export function fmtDay(key: string, now: Date = new Date()): string {
  const d = dateFromKey(key);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Grams as "4.2 kg (9 lb 4 oz)" — pediatricians use both. */
export function fmtWeight(grams: number): string {
  const kg = grams / 1000;
  const totalOz = grams / 28.3495;
  const lb = Math.floor(totalOz / 16);
  const oz = Math.round(totalOz - lb * 16);
  return `${kg.toFixed(2)} kg (${lb} lb ${oz} oz)`;
}

/** Signed grams-per-day, e.g. "+27 g/day". */
export function fmtGainPerDay(gPerDay: number): string {
  const sign = gPerDay >= 0 ? "+" : "−";
  return `${sign}${Math.abs(gPerDay).toFixed(0)} g/day`;
}
