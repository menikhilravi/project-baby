/**
 * Percentile curves and z-score lookups from the bundled WHO LMS tables.
 * LMS method: value(z) = M·(1 + L·S·z)^(1/L)  (or M·e^(S·z) when L≈0).
 */
import {
  WHO_LMS,
  WHO_MAX_MONTH,
  type Lms,
  type WhoMetric,
  type WhoSex,
} from "./who-growth";

export const PERCENTILES = ["p3", "p15", "p50", "p85", "p97"] as const;
export type PercentileKey = (typeof PERCENTILES)[number];

const Z: Record<PercentileKey, number> = {
  p3: -1.88079,
  p15: -1.03643,
  p50: 0,
  p85: 1.03643,
  p97: 1.88079,
};

export type CurvePoint = { x: number } & Record<PercentileKey, number>;

function lmsValue([l, m, s]: Lms, z: number): number {
  if (Math.abs(l) < 1e-7) return m * Math.exp(s * z);
  return m * Math.pow(1 + l * s * z, 1 / l);
}

/** Interpolated LMS at a fractional month. */
function lmsAt(metric: WhoMetric, sex: WhoSex, month: number): Lms | null {
  const table = WHO_LMS[metric][sex];
  if (month < 0 || month > WHO_MAX_MONTH) return null;
  const lo = Math.floor(month);
  const hi = Math.min(lo + 1, WHO_MAX_MONTH);
  const a = table[lo];
  const b = table[hi];
  const t = month - lo;
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Integer-month percentile curve points up to `maxMonth`. */
export function whoCurve(
  metric: WhoMetric,
  sex: WhoSex,
  maxMonth: number = WHO_MAX_MONTH,
): CurvePoint[] {
  const table = WHO_LMS[metric][sex];
  const upto = Math.max(1, Math.min(Math.ceil(maxMonth), WHO_MAX_MONTH));
  const out: CurvePoint[] = [];
  for (let m = 0; m <= upto; m++) {
    const lms = table[m];
    out.push({
      x: m,
      p3: round(lmsValue(lms, Z.p3)),
      p15: round(lmsValue(lms, Z.p15)),
      p50: round(lmsValue(lms, Z.p50)),
      p85: round(lmsValue(lms, Z.p85)),
      p97: round(lmsValue(lms, Z.p97)),
    });
  }
  return out;
}

/** Percentile (0–100) for a measured value at a given age. Null if off-table. */
export function valueToCentile(
  metric: WhoMetric,
  sex: WhoSex,
  month: number,
  value: number,
): number | null {
  const lms = lmsAt(metric, sex, month);
  if (!lms) return null;
  const [l, m, s] = lms;
  const z =
    Math.abs(l) < 1e-7
      ? Math.log(value / m) / s
      : (Math.pow(value / m, l) - 1) / (l * s);
  return Math.round(normalCdf(z) * 100);
}

function round(n: number): number {
  return +n.toFixed(2);
}

// Abramowitz & Stegun 7.1.26 error-function approximation.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** "50th", "3rd", "12th"… with an ordinal suffix. */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
