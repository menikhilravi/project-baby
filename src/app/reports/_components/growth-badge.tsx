"use client";

import { m } from "motion/react";
import { BabyMascot } from "@/components/mascot/baby-mascot";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ordinal } from "@/lib/growth-percentiles";
import { spring } from "@/lib/motion";

/**
 * "Tracking around the 48th percentile" with a mini band showing where that
 * sits. The mascot grows with *age*, never with percentile — a smaller
 * baby is not a worse baby, and the copy says so.
 */
export function GrowthBadge({
  label,
  value,
  unit,
  decimals,
  centile,
  ageMonths,
  sub,
}: {
  label: string;
  value: number;
  unit: string;
  decimals: number;
  centile: number | null;
  ageMonths: number | null;
  sub?: string;
}) {
  const clamped = centile == null ? null : Math.min(99, Math.max(1, centile));
  const scale = ageMonths == null ? 1 : 0.8 + Math.min(1, Math.max(0, ageMonths / 24)) * 0.35;

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-accent-baby-soft p-4">
      <div className="grid h-20 w-20 shrink-0 place-items-center">
        <m.div initial={{ scale: 0.6 }} animate={{ scale }} transition={spring.pop}>
          <BabyMascot mood="happy" size={72} />
        </m.div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-baby-strong">Latest {label.toLowerCase()}</p>
        <p className="font-display text-3xl font-semibold leading-tight">
          <AnimatedNumber value={value} decimals={decimals} />
          <span className="ml-1 text-base text-muted-foreground">{unit}</span>
        </p>
        {sub ? <p className="text-xs font-semibold text-muted-foreground">{sub}</p> : null}
        {clamped != null ? (
          <div className="mt-2">
            <div className="relative h-2.5 rounded-full bg-card">
              <span className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-accent-baby/30" />
              <m.span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-baby-strong ring-[3px] ring-card"
                initial={{ left: "50%" }}
                animate={{ left: `${clamped}%` }}
                transition={spring.gentle}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Around the <b className="text-foreground">{ordinal(clamped)} percentile</b> — healthy babies grow along
              every line; steady tracking matters more than the number.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
