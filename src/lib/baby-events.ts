/**
 * Shared shapes for the richer feed/diaper detail captured in baby_events.
 * Used by the logger capture UI, the timeline, and the reports dashboard.
 */

export type DiaperSubtype = "pee" | "poop" | "both";
export type FeedSubtype = "left" | "right" | "bottle" | "solid";
export type MedSubtype =
  | "vitamin_d"
  | "tylenol"
  | "gas_drops"
  | "probiotic"
  | "other";
export type EventSubtype = DiaperSubtype | FeedSubtype | MedSubtype;

/** oz/ml for feeds, f/c for temperature, iu/mg for med doses. */
export type EventUnit = "oz" | "ml" | "f" | "c" | "iu" | "mg";

export type EventDetail = {
  subtype?: EventSubtype;
  amount?: number;
  unit?: EventUnit;
};

export const DIAPER_SUBTYPES: DiaperSubtype[] = ["pee", "poop", "both"];
export const FEED_SUBTYPES: FeedSubtype[] = ["left", "right", "bottle", "solid"];
/** The two nursing sides — timed feed sessions rather than instant taps. */
export const BREAST_SIDES: Extract<FeedSubtype, "left" | "right">[] = [
  "left",
  "right",
];
export const MED_SUBTYPES: MedSubtype[] = [
  "vitamin_d",
  "tylenol",
  "gas_drops",
  "probiotic",
  "other",
];

/** Vitamin D is the daily one the Today card tracks; the rest are ad-hoc. */
export const MED_LABELS: Record<MedSubtype, string> = {
  vitamin_d: "Vitamin D",
  tylenol: "Tylenol",
  gas_drops: "Gas drops",
  probiotic: "Probiotic",
  other: "Other",
};

export function medLabel(subtype: string | null): string {
  if (!subtype) return "Medicine";
  return MED_LABELS[subtype as MedSubtype] ?? subtype;
}

const SUBTYPE_LABELS: Record<EventSubtype, string> = {
  pee: "pee",
  poop: "poop",
  both: "pee + poop",
  left: "left",
  right: "right",
  bottle: "bottle",
  solid: "solid",
  vitamin_d: "Vitamin D",
  tylenol: "Tylenol",
  gas_drops: "Gas drops",
  probiotic: "Probiotic",
  other: "medicine",
};

/** Human label for a timeline/detail line, e.g. "poop" or "bottle 4oz". */
export function subtypeLabel(
  subtype: string | null,
  amount?: number | null,
  unit?: string | null,
): string | null {
  if (!subtype) return null;
  const base = SUBTYPE_LABELS[subtype as EventSubtype] ?? subtype;
  if (subtype === "bottle" && amount != null) {
    return `${base} ${amount}${unit ?? ""}`;
  }
  return base;
}
