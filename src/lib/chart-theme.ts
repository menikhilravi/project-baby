/**
 * Shared chart palette + tooltip style so every recharts view in the app reads
 * as one system (Reports dashboard, activity detail metrics). Colours were
 * chosen for the reports charts; keep new charts on these rather than inventing
 * per-view hues. Categorical hues are assigned by entity, in fixed order.
 */

export const SLEEP_COLOR = "var(--reports)";
export const FEED_COLOR = "oklch(0.76 0.15 70)";

export const DIAPER_COLORS = {
  pee: "oklch(0.82 0.13 95)",
  poop: "oklch(0.52 0.08 60)",
  both: "oklch(0.64 0.11 45)",
  untyped: "var(--muted-foreground)",
} as const;

export const chartTooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

/** "12a" / "6a" / "12p" / "6p" axis label for an hour-of-day (0–23). */
export function hourTick(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}
