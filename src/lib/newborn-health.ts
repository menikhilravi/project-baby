/**
 * Pure, framework-free helpers for the Tier-1 newborn health features:
 * fever detection (age-gated) and daily diaper-output adequacy. Callers pass
 * `now`; nothing here reads the clock or the DB.
 *
 * Guidance sources (not medical advice, and surfaced as such in the UI):
 *   - Fever ≥100.4°F (38°C) under 3 months is an ER-level emergency. (AAP / CHOP)
 *   - After the first week, expect ≥6 wet and ≥3 dirty diapers/day; the first
 *     week ramps up day-by-day (day N → ~N wet). (AAP / HealthyChildren)
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const FEVER_F = 100.4;
export const FEVER_C = 38.0;
/** Below this a newborn is too cold — also worth a pediatrician call. */
export const LOW_TEMP_F = 97.0;
export const LOW_TEMP_C = 36.1;

/** Whole days since birth (0 on the birth day). Null if no birth date. */
export function ageInDays(birthDate: string | null, now: Date): number | null {
  if (!birthDate) return null;
  const ms = now.getTime() - new Date(`${birthDate}T00:00:00`).getTime();
  return Math.floor(ms / DAY_MS);
}

/** Day of life, 1-indexed (birth day = day 1) — matches how nurses count. */
export function dayOfLife(birthDate: string | null, now: Date): number | null {
  const d = ageInDays(birthDate, now);
  return d == null ? null : d + 1;
}

export type TempReading = { amount: number; unit: "f" | "c" };

export function toFahrenheit({ amount, unit }: TempReading): number {
  return unit === "f" ? amount : amount * 1.8 + 32;
}

export type TempStatus = "normal" | "elevated" | "fever" | "low";

/**
 * Classify a reading. "fever" at/above 100.4°F, "elevated" in the 99.5–100.3
 * grey zone, "low" below 97°F. Age is applied by the caller for the
 * emergency framing (under 3 months → seek care now).
 */
export function classifyTemp(reading: TempReading): TempStatus {
  const f = toFahrenheit(reading);
  if (f >= FEVER_F) return "fever";
  if (f <= LOW_TEMP_F) return "low";
  if (f >= 99.5) return "elevated";
  return "normal";
}

export type FeverAlert = {
  status: TempStatus;
  fahrenheit: number;
  /** Under 3 months → any fever is an emergency, per AAP. */
  underThreeMonths: boolean;
  /** True when this reading warrants contacting a pediatrician now. */
  urgent: boolean;
};

export function feverAlert(
  reading: TempReading,
  birthDate: string | null,
  now: Date,
): FeverAlert {
  const status = classifyTemp(reading);
  const days = ageInDays(birthDate, now);
  const underThreeMonths = days != null && days < 90;
  const urgent =
    status === "low" || (status === "fever" && (underThreeMonths || days == null));
  return {
    status,
    fahrenheit: Math.round(toFahrenheit(reading) * 10) / 10,
    underThreeMonths,
    urgent,
  };
}

export type DiaperCounts = { wet: number; dirty: number };

export type DiaperGuidance = {
  wet: number;
  dirty: number;
  targetWet: number;
  targetDirty: number;
  wetMet: boolean;
  dirtyMet: boolean;
  /** "good" once both targets are met; "building" while still counting up. */
  status: "good" | "building";
  note: string;
};

/**
 * Compare today's counts against the age-appropriate target. Counts accumulate
 * across the day, so an unmet target reads as "building" (reassuring), never an
 * alarm — the note carries the day-by-day newborn expectation.
 */
export function diaperGuidance(
  counts: DiaperCounts,
  birthDate: string | null,
  now: Date,
): DiaperGuidance {
  const dol = dayOfLife(birthDate, now);
  // First week ramps up (day N → ~N wet); from day 6 on, the steady ≥6 / ≥3.
  const targetWet = dol != null && dol <= 5 ? Math.max(1, dol) : 6;
  const targetDirty = dol != null && dol <= 4 ? 1 : 3;
  const wetMet = counts.wet >= targetWet;
  const dirtyMet = counts.dirty >= targetDirty;
  const status = wetMet && dirtyMet ? "good" : "building";
  const note =
    dol != null && dol <= 5
      ? `Day ${dol}: aim for about ${targetWet} wet and ${targetDirty}+ dirty.`
      : `Aim for ${targetWet}+ wet and ${targetDirty}+ dirty a day.`;
  return {
    wet: counts.wet,
    dirty: counts.dirty,
    targetWet,
    targetDirty,
    wetMet,
    dirtyMet,
    status,
    note,
  };
}

/** Fold diaper subtypes into wet / dirty tallies (both counts as each). */
export function tallyDiapers(
  rows: { subtype: string | null }[],
): DiaperCounts {
  let wet = 0;
  let dirty = 0;
  for (const r of rows) {
    if (r.subtype === "pee") wet += 1;
    else if (r.subtype === "poop") dirty += 1;
    else if (r.subtype === "both") {
      wet += 1;
      dirty += 1;
    } else {
      // Untyped quick-tap — count it as wet (the common case).
      wet += 1;
    }
  }
  return { wet, dirty };
}
