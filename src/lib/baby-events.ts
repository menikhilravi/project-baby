/**
 * Shared shapes for the richer feed/diaper detail captured in baby_events.
 * Used by the logger capture UI, the timeline, and the reports dashboard.
 */

export type DiaperSubtype = "pee" | "poop" | "both";
export type FeedSubtype = "left" | "right" | "bottle" | "solid";
export type EventSubtype = DiaperSubtype | FeedSubtype;

export type EventUnit = "oz" | "ml";

export type EventDetail = {
  subtype?: EventSubtype;
  amount?: number;
  unit?: EventUnit;
};

export const DIAPER_SUBTYPES: DiaperSubtype[] = ["pee", "poop", "both"];
export const FEED_SUBTYPES: FeedSubtype[] = ["left", "right", "bottle", "solid"];

const SUBTYPE_LABELS: Record<EventSubtype, string> = {
  pee: "pee",
  poop: "poop",
  both: "pee + poop",
  left: "left",
  right: "right",
  bottle: "bottle",
  solid: "solid",
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
