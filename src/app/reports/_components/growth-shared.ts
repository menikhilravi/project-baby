export type GrowthRow = {
  id: number;
  measured_on: string;
  weight_g: number | null;
  height_cm: number | null;
  head_cm: number | null;
};

export type GrowthMetric = "weight" | "height" | "head";

export const GROWTH_METRICS: { key: GrowthMetric; label: string; unit: string }[] = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "height", label: "Length", unit: "cm" },
  { key: "head", label: "Head", unit: "cm" },
];

const MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

export function metricValue(row: GrowthRow, m: GrowthMetric): number | null {
  if (m === "weight") return row.weight_g == null ? null : Number(row.weight_g) / 1000;
  if (m === "height") return row.height_cm == null ? null : Number(row.height_cm);
  return row.head_cm == null ? null : Number(row.head_cm);
}

export function ageInMonths(birthDate: string, measuredOn: string): number {
  const ms = Date.parse(`${measuredOn}T00:00:00Z`) - Date.parse(`${birthDate}T00:00:00Z`);
  return ms / MS_PER_MONTH;
}

/** "Oct 13" from a YYYY-MM-DD calendar date (no timezone shift). */
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y) return ymd;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function kgToLbOz(kg: number): string {
  const totalOz = kg * 35.274;
  const lb = Math.floor(totalOz / 16);
  const oz = Math.round(totalOz - lb * 16);
  return oz === 16 ? `${lb + 1} lb 0 oz` : `${lb} lb ${oz} oz`;
}
