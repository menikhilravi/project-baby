/**
 * Shared chart palette + tooltip style so every recharts view in the app reads
 * as one system (Reports dashboard, activity detail metrics). Colours were
 * chosen for the reports charts; keep new charts on these rather than inventing
 * per-view hues. Categorical hues are assigned by entity, in fixed order.
 */

export const SLEEP_COLOR = "var(--kind-sleep)";
export const FEED_COLOR = "var(--kind-feed)";
/** Matches how meds/Vitamin D are tinted across the app. */
export const VITAMIN_D_COLOR = "var(--kind-med)";

export const DIAPER_COLORS = {
  pee: "var(--diaper-pee)",
  poop: "var(--diaper-poop)",
  both: "var(--diaper-both)",
  untyped: "var(--muted-foreground)",
} as const;

export const chartTooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft-v)",
  fontSize: 12,
  padding: "8px 12px",
  color: "var(--popover-foreground)",
} as const;

/** Fully rounded single-series bars. Stacks round only the top segment. */
export const BAR_RADIUS: [number, number, number, number] = [8, 8, 8, 8];
export const BAR_RADIUS_TOP: [number, number, number, number] = [8, 8, 0, 0];

export const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

export const gridProps = {
  vertical: false,
  stroke: "var(--border)",
  strokeDasharray: "3 6",
} as const;

/** Rounded wash behind the hovered bar/point. */
export const chartCursor = { fill: "var(--accent-baby-soft)", radius: 10 } as const;

/** "12a" / "6a" / "12p" / "6p" axis label for an hour-of-day (0–23). */
export function hourTick(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}
