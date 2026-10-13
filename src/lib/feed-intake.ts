/**
 * A *typical* daily bottle-intake band for context — not a target. The common
 * rule of thumb is ~2–2.5 oz of milk per pound of body weight per day, topping
 * out around 32 oz. Intake ramps up through the first week, so no band is
 * shown before day 7. Always defer to the pediatrician.
 */
export const OZ_PER_LB_LOW = 2;
export const OZ_PER_LB_HIGH = 2.5;
export const DAILY_OZ_CAP = 32;

export function dailyIntakeRangeOz(
  weightKg: number | null,
  ageDays: number | null,
): { low: number; high: number } | null {
  if (weightKg == null || !(weightKg > 0)) return null;
  if (ageDays == null || ageDays < 7) return null;
  // Past ~6 months solids take over part of the intake; the rule stops applying.
  if (ageDays > 183) return null;
  const lb = weightKg * 2.20462;
  const low = Math.min(DAILY_OZ_CAP, Math.round(lb * OZ_PER_LB_LOW));
  const high = Math.min(DAILY_OZ_CAP, Math.round(lb * OZ_PER_LB_HIGH));
  return { low, high };
}
