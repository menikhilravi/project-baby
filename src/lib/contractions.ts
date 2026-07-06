/**
 * Contraction timing + the 5-1-1 labor rule.
 *
 * A contraction is one `baby_events` row: `start` (occurred_at) → `end`
 * (ended_at). `end === null` means it is happening right now.
 *
 *   • Duration  = end − start  (how long the tightening lasts)
 *   • Frequency = start[i] − start[i−1]  (start-to-start, i.e. how far apart
 *                 contractions are — the number people mean by "5 minutes apart")
 *
 * The 5-1-1 rule (a common "time to go to the hospital" guideline): contractions
 * about **5** minutes apart, each lasting **1** minute, sustained for **1** hour.
 *
 * None of this is medical advice — it's a timer that surfaces the pattern. The UI
 * always tells the user to trust their body and call their provider.
 */

export type Contraction = {
  id: number;
  start: string; // ISO — occurred_at
  end: string | null; // ISO — ended_at, null while in progress
};

export const MINUTE_MS = 60_000;

// 5-1-1 thresholds, with a little tolerance so a 58s / 5m10s pattern still counts.
export const FIVE_ONE_ONE = {
  maxFrequencyMs: 5.5 * MINUTE_MS, // ≤ ~5 min apart (start to start)
  minDurationMs: 45_000, // ≥ ~1 min long (with tolerance)
  minSustainedMs: 60 * MINUTE_MS, // ≥ 1 hour of this pattern
} as const;

export type ContractionStats = {
  /** Completed contractions in the window, oldest → newest. */
  completed: Contraction[];
  /** True if the most recent contraction has no end yet. */
  inProgress: boolean;
  /** Duration (ms) of each completed contraction, oldest → newest. */
  durations: number[];
  /** Start-to-start gaps (ms) between consecutive contractions. */
  frequencies: number[];
  avgDurationMs: number | null;
  avgFrequencyMs: number | null;
  /** Coefficient of variation of the gaps (stddev / mean). Lower = more regular. */
  frequencyCv: number | null;
  /** Span from the first to the last start in the window (ms). */
  sustainedMs: number;
  /** Negative gap-trend = getting closer together; positive duration-trend = longer. */
  gettingCloser: boolean;
  gettingLonger: boolean;
  meetsFiveOneOne: boolean;
};

/**
 * Compute stats over the recent run of contractions. `contractions` may be in
 * any order; only those starting within `windowMs` of `now` are considered so a
 * long-ago practice session doesn't pollute the current pattern.
 */
export function computeContractionStats(
  contractions: Contraction[],
  now: number,
  windowMs: number = 60 * MINUTE_MS,
): ContractionStats {
  const since = now - windowMs;
  const sorted = [...contractions]
    .filter((c) => new Date(c.start).getTime() >= since)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const inProgress = sorted.length > 0 && sorted[sorted.length - 1].end === null;
  const completed = sorted.filter((c) => c.end !== null);

  const durations = completed.map(
    (c) => new Date(c.end as string).getTime() - new Date(c.start).getTime(),
  );

  // Frequencies use every start (including an in-progress one) so "how far apart"
  // reflects the latest contraction beginning.
  const starts = sorted.map((c) => new Date(c.start).getTime());
  const frequencies: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    frequencies.push(starts[i] - starts[i - 1]);
  }

  const avgDurationMs = mean(durations);
  const avgFrequencyMs = mean(frequencies);
  const frequencyCv =
    avgFrequencyMs && frequencies.length >= 2
      ? stddev(frequencies) / avgFrequencyMs
      : null;

  const sustainedMs =
    starts.length >= 2 ? starts[starts.length - 1] - starts[0] : 0;

  const gettingCloser = trend(frequencies) < 0;
  const gettingLonger = trend(durations) > 0;

  const meetsFiveOneOne =
    avgFrequencyMs !== null &&
    avgFrequencyMs <= FIVE_ONE_ONE.maxFrequencyMs &&
    avgDurationMs !== null &&
    avgDurationMs >= FIVE_ONE_ONE.minDurationMs &&
    sustainedMs >= FIVE_ONE_ONE.minSustainedMs &&
    completed.length >= 8; // ~one per ≤5 min over an hour

  return {
    completed,
    inProgress,
    durations,
    frequencies,
    avgDurationMs,
    avgFrequencyMs,
    frequencyCv,
    sustainedMs,
    gettingCloser,
    gettingLonger,
    meetsFiveOneOne,
  };
}

export type LaborLevel =
  | "waiting" // not enough data yet
  | "braxton" // irregular / practice contractions
  | "early" // organizing, real but not yet 5-1-1
  | "active"; // 5-1-1 met — time to call

export type LaborAssessment = {
  level: LaborLevel;
  /** Short headline, e.g. "Looks like active labor". */
  title: string;
  /** One or two sentences of plain-language guidance. */
  message: string;
};

/**
 * Classify the current pattern. Deliberately conservative: it never says "not
 * labor", only "looks like practice contractions", and always defers to the
 * user's provider for the real call.
 */
export function assessLabor(stats: ContractionStats): LaborAssessment {
  const {
    completed,
    avgFrequencyMs,
    frequencyCv,
    meetsFiveOneOne,
    gettingCloser,
    gettingLonger,
  } = stats;

  if (completed.length < 3 || avgFrequencyMs === null) {
    return {
      level: "waiting",
      title: "Keep timing",
      message:
        "Log a few more contractions and a pattern will start to show. Tap when tightening begins, tap again when it eases.",
    };
  }

  if (meetsFiveOneOne) {
    return {
      level: "active",
      title: "This looks like active labor",
      message:
        "Your contractions fit the 5-1-1 pattern — about 5 minutes apart, ~1 minute long, for an hour. Call your provider or head to your birth place.",
    };
  }

  const regular = frequencyCv !== null && frequencyCv < 0.28;
  const closeEnough = avgFrequencyMs <= 6.5 * MINUTE_MS;
  const progressing = gettingCloser || gettingLonger;

  if (regular && (closeEnough || progressing)) {
    return {
      level: "early",
      title: "Looks like early labor",
      message:
        "Contractions are coming in a regular rhythm and organizing. Keep timing, rest between them, and stay in touch with your provider — call if they hit 5-1-1 or your water breaks.",
    };
  }

  return {
    level: "braxton",
    title: "Likely Braxton Hicks",
    message:
      "These look irregular and spaced out — more like practice contractions. Try changing position, empty your bladder, and drink some water. If they fade, they weren't the real thing; if they get regular and closer, keep timing.",
  };
}

/** "5m 10s", "58s", "1h 4m" — compact human duration from milliseconds. */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * Sign of the slope of a simple least-squares fit over the series (index → value).
 * Positive = rising over time, negative = falling. Needs ≥ 3 points to be meaningful.
 */
function trend(xs: number[]): number {
  if (xs.length < 3) return 0;
  const n = xs.length;
  const xMean = (n - 1) / 2;
  const yMean = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (xs[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
