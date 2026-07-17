/**
 * Pure helpers for the checkups page: turn a baby's birth date + the reference
 * schedule into per-visit due dates and simple statuses. All wall-clock reads
 * take an injectable `now` so callers stay testable.
 */

import { WELL_VISITS, type WellVisit } from "@/data/immunizations";

export type VisitStatus = "done" | "overdue" | "soon" | "upcoming";

/** Add whole months to a date, clamping to the end of shorter months. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // Overflow (e.g. adding 1mo to Jan 31 → Mar 3) rolls back to the last valid day.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

/** Recommended date for a visit, from birth date + the visit's age in months. */
export function visitDueDate(birthDate: string, ageMonths: number): Date {
  const birth = new Date(`${birthDate}T00:00:00`);
  return addMonths(birth, ageMonths);
}

/**
 * Status for a scheduled/expected visit. `completed` wins; otherwise it's
 * relative to `due`: past → overdue, within 14 days → soon, else upcoming.
 */
export function visitStatus(
  due: Date,
  completed: boolean,
  now: Date = new Date(),
): VisitStatus {
  if (completed) return "done";
  const ms = due.getTime() - now.getTime();
  const day = 24 * 60 * 60_000;
  if (ms < 0) return "overdue";
  if (ms <= 14 * day) return "soon";
  return "upcoming";
}

/** The visits that fall on or before `ageMonths` — the ones relevant so far. */
export function visitsThrough(ageMonths: number): WellVisit[] {
  return WELL_VISITS.filter((v) => v.ageMonths <= ageMonths + 1);
}
