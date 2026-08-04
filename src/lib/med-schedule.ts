/**
 * Pure helpers for scheduled medicine doses — "Vitamin D at 9:00", "gas drops
 * at 14:00 and 20:00". Shared by the reminder cron and the Today card so the
 * given / due / missed judgement a parent reads on screen is the exact one
 * that fires (or suppresses) the push.
 *
 * Times are local wall-clock. Nothing here reads the clock, the DB, or a
 * timezone database: callers pass minutes-since-local-midnight.
 */

import { MED_LABELS, MED_SUBTYPES, type MedSubtype } from "./baby-events";

export type MedScheduleRow = {
  id: number;
  subtype: string;
  label: string | null;
  /** Local 24h "HH:MM" strings. */
  times: string[];
  amount: number | null;
  unit: string | null;
  active: boolean;
};

/** A dose logged late still counts for its slot, up to this many minutes. */
export const DEFAULT_TOLERANCE_MIN = 120;
/** How long a missed slot keeps nudging before we let it go for the day. */
export const DEFAULT_GRACE_MIN = 120;

export const MED_UNITS = ["iu", "mg", "ml"] as const;
export type MedUnit = (typeof MED_UNITS)[number];

/** The unit a med is usually measured in — pre-fills the dose field. */
export function defaultMedUnit(subtype: string | null): MedUnit | "" {
  if (subtype === "vitamin_d") return "iu";
  if (subtype === "gas_drops" || subtype === "probiotic") return "ml";
  if (subtype === "tylenol") return "mg";
  return "";
}

/** Display name for a schedule — the custom label wins, else the med's name. */
export function scheduleName(s: Pick<MedScheduleRow, "subtype" | "label">): string {
  const custom = s.label?.trim();
  if (custom) return custom;
  return MED_LABELS[s.subtype as MedSubtype] ?? "Medicine";
}

export function isMedSubtype(value: string): value is MedSubtype {
  return (MED_SUBTYPES as string[]).includes(value);
}

/** "09:30" → 570 minutes past midnight. Null for anything not 24h HH:MM. */
export function parseHhMm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** 570 → "09:30". */
export function toHhMm(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 570 → "9:30 AM", in the viewer's locale. */
export function formatSlot(minutes: number): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** A schedule's times as sorted, de-duped minutes; invalid entries dropped. */
export function scheduleMinutes(times: string[] | null | undefined): number[] {
  const parsed = (times ?? [])
    .map(parseHhMm)
    .filter((m): m is number => m !== null);
  return [...new Set(parsed)].sort((a, b) => a - b);
}

/** Normalize user input back to storage form — sorted, de-duped "HH:MM". */
export function normalizeTimes(times: string[] | null | undefined): string[] {
  return scheduleMinutes(times).map(toHhMm);
}

export type SlotStatus = {
  /** Scheduled minute-of-day. */
  slotMin: number;
  /** Minute-of-day of the dose that satisfied this slot, or null if unmet. */
  givenMin: number | null;
};

/**
 * Pair each scheduled slot with the logged dose that most plausibly satisfies
 * it. Globally greedy — closest (slot, dose) pair wins first — so a dose given
 * between two slots lands on the nearer one instead of whichever came first in
 * the array. Each dose can satisfy at most one slot, and vice versa.
 */
export function matchDoses(
  slotMins: number[],
  doseMins: number[],
  toleranceMin: number = DEFAULT_TOLERANCE_MIN,
): SlotStatus[] {
  const pairs: { slot: number; dose: number; dist: number }[] = [];
  slotMins.forEach((slot, si) => {
    doseMins.forEach((dose, di) => {
      const dist = Math.abs(dose - slot);
      if (dist <= toleranceMin) pairs.push({ slot: si, dose: di, dist });
    });
  });
  pairs.sort((a, b) => a.dist - b.dist || a.slot - b.slot || a.dose - b.dose);

  const takenBySlot: (number | null)[] = slotMins.map(() => null);
  const usedDoses = new Set<number>();
  for (const p of pairs) {
    if (takenBySlot[p.slot] !== null || usedDoses.has(p.dose)) continue;
    takenBySlot[p.slot] = doseMins[p.dose];
    usedDoses.add(p.dose);
  }
  return slotMins.map((slotMin, i) => ({ slotMin, givenMin: takenBySlot[i] }));
}

/**
 * Slots worth nudging about right now: reached, still unmet, and inside the
 * grace window. A slot late in the evening stops nudging at local midnight
 * rather than bleeding into the next day.
 */
export function dueSlots(
  statuses: SlotStatus[],
  nowMin: number,
  graceMin: number = DEFAULT_GRACE_MIN,
): SlotStatus[] {
  return statuses.filter(
    (s) =>
      s.givenMin === null &&
      nowMin >= s.slotMin &&
      nowMin < Math.min(s.slotMin + graceMin, 1440),
  );
}

/** The next unmet slot at or after `nowMin`; null when the day is done. */
export function nextSlot(
  statuses: SlotStatus[],
  nowMin: number,
): SlotStatus | null {
  return (
    statuses.find((s) => s.givenMin === null && s.slotMin >= nowMin) ?? null
  );
}
