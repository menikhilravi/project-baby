"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RulerInput } from "@/components/ui/ruler-input";
import { useCelebrate } from "@/components/celebrate/celebrate-provider";
import { useTimeZone } from "@/components/providers/time-zone";
import { toast } from "@/lib/toast";
import { ordinal, valueToCentile, whoCurve } from "@/lib/growth-percentiles";
import { ymdIn } from "@/lib/time-format";
import type { WhoSex } from "@/lib/who-growth";
import { addMeasurement } from "../growth-actions";
import { ageInMonths, kgToLbOz, metricValue, type GrowthMetric, type GrowthRow } from "./growth-shared";

const RULERS: Record<
  GrowthMetric,
  { label: string; unit: string; min: number; max: number; step: number; majorEvery: number; decimals: number }
> = {
  weight: { label: "Weight", unit: "kg", min: 1.5, max: 16, step: 0.05, majorEvery: 10, decimals: 2 },
  height: { label: "Length", unit: "cm", min: 40, max: 100, step: 0.5, majorEvery: 10, decimals: 1 },
  head: { label: "Head", unit: "cm", min: 30, max: 52, step: 0.1, majorEvery: 10, decimals: 1 },
};

/**
 * Record a pediatrician's measurements with ruler inputs, prefilled from the
 * last visit (or the WHO median for this age), then celebrate.
 */
export function AddMeasurementSheet({
  open,
  onOpenChange,
  measurements,
  birthDate,
  sex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurements: GrowthRow[];
  birthDate: string | null;
  sex: WhoSex;
}) {
  const { tz } = useTimeZone();
  const today = ymdIn(new Date(), tz);
  const [date, setDate] = useState(today);
  const [include, setInclude] = useState<Record<GrowthMetric, boolean>>({ weight: true, height: false, head: false });
  const [values, setValues] = useState<Record<GrowthMetric, number>>(() => ({
    weight: seed("weight", measurements, birthDate, sex, today),
    height: seed("height", measurements, birthDate, sex, today),
    head: seed("head", measurements, birthDate, sex, today),
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const celebrate = useCelebrate();

  const save = () => {
    setError(null);
    if (!include.weight && !include.height && !include.head) {
      setError("Pick at least one measurement.");
      return;
    }
    startTransition(async () => {
      try {
        await addMeasurement({
          measured_on: date,
          weight_g: include.weight ? Math.round(values.weight * 1000) : null,
          height_cm: include.height ? values.height : null,
          head_cm: include.head ? values.head : null,
        });
        celebrate("growth", { word: "Growing!", mood: "celebrate" });
        const primary: GrowthMetric = include.weight ? "weight" : include.height ? "height" : "head";
        const centile =
          birthDate != null
            ? valueToCentile(primary, sex, ageInMonths(birthDate, date), values[primary])
            : null;
        toast.success(
          "Measurement saved",
          centile != null
            ? `${RULERS[primary].label} is around the ${ordinal(Math.min(99, Math.max(1, centile)))} percentile`
            : undefined,
        );
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="New measurement"
      description="From a checkup or a home scale. Choose what you measured."
    >
      <div className="space-y-5 pb-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="What did you measure?">
          {(Object.keys(RULERS) as GrowthMetric[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={include[k]}
              onClick={() => setInclude((s) => ({ ...s, [k]: !s[k] }))}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors",
                include[k]
                  ? "border-transparent bg-accent-baby-soft text-accent-baby-strong ring-2 ring-accent-baby/40"
                  : "bg-card text-muted-foreground",
              )}
            >
              {include[k] ? <Check className="h-4 w-4" /> : null}
              {RULERS[k].label}
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</span>
          <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="max-w-48" />
        </label>

        {(Object.keys(RULERS) as GrowthMetric[]).map((k) =>
          include[k] ? (
            <RulerInput
              key={k}
              label={RULERS[k].label}
              unit={RULERS[k].unit}
              min={RULERS[k].min}
              max={RULERS[k].max}
              step={RULERS[k].step}
              majorEvery={RULERS[k].majorEvery}
              decimals={RULERS[k].decimals}
              value={values[k]}
              onChange={(v) => setValues((s) => ({ ...s, [k]: v }))}
              hint={k === "weight" ? `≈ ${kgToLbOz(values.weight)}` : undefined}
            />
          ) : null,
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button variant="squish" size="xl" className="w-full" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save measurement"}
        </Button>
      </div>
    </Sheet>
  );
}

/** Last measured value, else the WHO median for today's age, else a newborn-ish default. */
function seed(
  metric: GrowthMetric,
  rows: GrowthRow[],
  birthDate: string | null,
  sex: WhoSex,
  today: string,
): number {
  const last = [...rows]
    .sort((a, b) => b.measured_on.localeCompare(a.measured_on))
    .map((r) => metricValue(r, metric))
    .find((v) => v != null);
  if (last != null) return last;
  if (birthDate) {
    const age = Math.max(0, Math.round(ageInMonths(birthDate, today)));
    const curve = whoCurve(metric, sex, Math.max(1, age));
    const point = curve[Math.min(age, curve.length - 1)];
    if (point) return metric === "weight" ? +point.p50.toFixed(2) : +point.p50.toFixed(1);
  }
  return metric === "weight" ? 3.4 : metric === "height" ? 50 : 35;
}
