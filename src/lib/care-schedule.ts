/**
 * Pure, framework-free helpers for the feed cadence — the "when's the next
 * feed due" math. Shared by the care-reminder cron and the feed metrics UI so
 * the prediction a parent sees on screen is the exact one that fires the push.
 *
 * Rows are stored UTC; everything here works in absolute time (ms), so it's
 * timezone-agnostic. Nothing reads the clock or the DB — callers pass `now`.
 */

export type FeedTime = { occurred_at: string };

export type FeedIntervalOpts = {
  /** Ignore gaps shorter than this (cluster-feeding bursts). Default 90m. */
  floorMin?: number;
  /** Clamp long overnight gaps so they don't inflate the typical cadence. Default 240m. */
  capMin?: number;
};

/**
 * Median gap between consecutive feeds, in minutes, clamped to [floor, cap].
 * Returns null when there aren't enough feeds to say anything (need ≥3, i.e.
 * ≥2 gaps). Median (not mean) so one long overnight stretch doesn't skew it.
 */
export function medianFeedIntervalMin(
  feeds: FeedTime[],
  opts: FeedIntervalOpts = {},
): number | null {
  const floorMin = opts.floorMin ?? 90;
  const capMin = opts.capMin ?? 240;

  const times = feeds
    .map((f) => new Date(f.occurred_at).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  if (times.length < 3) return null;

  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const gapMin = (times[i] - times[i - 1]) / 60_000;
    if (gapMin > 0) gaps.push(gapMin);
  }
  if (gaps.length < 2) return null;

  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median =
    gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];

  return Math.min(capMin, Math.max(floorMin, Math.round(median)));
}

/**
 * Sensible fallback interval (minutes) when there's too little history to
 * derive one — newborns feed ~every 2.5h, easing toward 3h+ past the newborn
 * weeks. Age is in whole days (see `ageInDays`); null → assume newborn.
 */
export function defaultFeedIntervalMin(ageDays: number | null): number {
  if (ageDays == null || ageDays < 56) return 150; // ~0–8 weeks
  if (ageDays < 168) return 180; // ~2–6 months
  return 210;
}

export function nextFeedDue(lastFeedIso: string, intervalMin: number): Date {
  return new Date(new Date(lastFeedIso).getTime() + intervalMin * 60_000);
}

export type FeedDueStatus = {
  dueAt: Date;
  /** >0 = overdue by this many minutes; ≤0 = due in |x| minutes. */
  overdueMin: number;
  /** Short human label, e.g. "~40m", "due now", "25m ago". */
  label: string;
};

/** Where the next feed sits relative to `now`, with a display label. */
export function feedDueStatus(
  lastFeedIso: string,
  intervalMin: number,
  now: Date,
): FeedDueStatus {
  const dueAt = nextFeedDue(lastFeedIso, intervalMin);
  const overdueMin = Math.round((now.getTime() - dueAt.getTime()) / 60_000);
  let label: string;
  if (overdueMin >= 5) label = `${fmtMin(overdueMin)} ago`;
  else if (overdueMin > -5) label = "due now";
  else label = `~${fmtMin(-overdueMin)}`;
  return { dueAt, overdueMin, label };
}

function fmtMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}
