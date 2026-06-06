/**
 * SweetSpot-lite next-nap predictor. Pure + timezone-agnostic: pass `now`
 * and Date objects; the caller formats in local time.
 *
 * Approach: start from an age-appropriate wake window, then nudge toward the
 * baby's *observed* recent wake windows (awake gaps between sleeps). Anchored
 * to when the baby last woke. Gated under ~2 months, like Huckleberry.
 */

export type SleepInterval = { start: Date; end: Date | null };

export type NapPrediction =
  | {
      status: "ok";
      windowStart: Date;
      windowEnd: Date;
      overdue: boolean;
      confidence: "low" | "medium" | "high";
      wakeWindowMin: number;
      basedOn: number;
    }
  | { status: "sleeping" }
  | { status: "too-young"; ageWeeks: number }
  | { status: "no-data" };

const WEEK_MS = 7 * 24 * 60 * 60_000;
const MIN_AGE_WEEKS = 8;

/** Baseline awake window (minutes) by age in weeks. */
function baselineWakeWindowMin(ageWeeks: number): number {
  if (ageWeeks < 13) return 90; // 2–3 mo
  if (ageWeeks < 17) return 105; // 3–4 mo
  if (ageWeeks < 26) return 135; // 4–6 mo
  if (ageWeeks < 39) return 165; // 6–9 mo
  if (ageWeeks < 52) return 195; // 9–12 mo
  if (ageWeeks < 78) return 240; // 12–18 mo
  return 300; // 18 mo+
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function predictNextNap(
  birthDate: string | null,
  sleeps: SleepInterval[],
  now: Date = new Date(),
): NapPrediction {
  if (!birthDate) return { status: "no-data" };
  const ageWeeks = (now.getTime() - new Date(birthDate).getTime()) / WEEK_MS;
  if (ageWeeks < MIN_AGE_WEEKS) {
    return { status: "too-young", ageWeeks: Math.max(0, Math.floor(ageWeeks)) };
  }

  // Currently asleep? Nothing to predict.
  if (sleeps.some((s) => s.end === null && s.start <= now)) {
    return { status: "sleeping" };
  }

  const completed = sleeps
    .filter((s): s is { start: Date; end: Date } => s.end !== null)
    .sort((a, b) => b.end.getTime() - a.end.getTime());
  if (completed.length === 0) return { status: "no-data" };

  const lastWake = completed[0].end;
  const baseline = baselineWakeWindowMin(ageWeeks);

  // Observed awake gaps (minutes) between consecutive sleeps over recent data.
  const asc = [...completed].sort((a, b) => a.start.getTime() - b.start.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < asc.length; i++) {
    const gapMin = (asc[i].start.getTime() - asc[i - 1].end.getTime()) / 60_000;
    // Discard noise: ignore tiny or implausibly long gaps (missed logs).
    if (gapMin >= 20 && gapMin <= baseline * 3) gaps.push(gapMin);
  }

  let wakeWindowMin = baseline;
  let confidence: "low" | "medium" | "high" = "low";
  if (gaps.length >= 5) {
    wakeWindowMin = Math.round(0.4 * baseline + 0.6 * median(gaps));
    confidence = "high";
  } else if (gaps.length >= 2) {
    wakeWindowMin = Math.round(0.5 * baseline + 0.5 * median(gaps));
    confidence = "medium";
  }

  const start = new Date(lastWake.getTime() + wakeWindowMin * 60_000);
  const overdue = start < now;
  const windowStart = overdue ? now : start;
  const windowEnd = new Date(windowStart.getTime() + 20 * 60_000);

  return {
    status: "ok",
    windowStart,
    windowEnd,
    overdue,
    confidence,
    wakeWindowMin,
    basedOn: gaps.length,
  };
}
