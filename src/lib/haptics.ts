/**
 * Tiny haptics helper. Android Chrome supports navigator.vibrate; iOS Safari
 * does not, so this is a silent no-op there. Skipped for reduced-motion users.
 */
type Haptic = "tap" | "tick" | "success" | "warning";

const PATTERNS: Record<Haptic, number | number[]> = {
  tap: 8,
  tick: 4,
  success: [10, 40, 16],
  warning: [24, 60, 24],
};

export function haptic(kind: Haptic = "tap") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Some browsers throw when vibration is blocked by a permissions policy.
  }
}
