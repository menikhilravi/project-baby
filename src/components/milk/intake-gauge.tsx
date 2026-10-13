"use client";

import { m } from "motion/react";
import { Milk } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { spring } from "@/lib/motion";

/**
 * Today's bottle total as a milk-filled pill, with the typical daily band
 * (for the baby's weight) marked on the track. Purely informational.
 */
export function IntakeGauge({
  oz,
  range,
  className,
}: {
  oz: number;
  range: { low: number; high: number } | null;
  className?: string;
}) {
  const scaleMax = Math.max(range ? range.high * 1.2 : 24, oz * 1.1, 8);
  const pct = Math.min(1, oz / scaleMax);
  const band = range
    ? { left: (range.low / scaleMax) * 100, width: ((range.high - range.low) / scaleMax) * 100 }
    : null;

  return (
    <section
      className={
        "rounded-card border bg-card p-5 shadow-soft " + (className ?? "")
      }
      aria-label="Bottle intake today"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-kind-feed-soft text-kind-feed-strong">
          <Milk className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bottles today</p>
          <p className="font-display text-2xl font-semibold leading-tight">
            <AnimatedNumber value={oz} decimals={oz % 1 ? 1 : 0} />
            <span className="ml-1 text-base text-muted-foreground">oz</span>
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-5 overflow-hidden rounded-full bg-muted">
        {band ? (
          <span
            className="absolute inset-y-0 rounded-full bg-kind-feed/20 ring-1 ring-inset ring-kind-feed/40"
            style={{ left: `${band.left}%`, width: `${band.width}%` }}
          />
        ) : null}
        <m.span
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[linear-gradient(90deg,var(--milk),color-mix(in_oklab,var(--milk)_75%,var(--kind-feed)))] shadow-[inset_0_-2px_0_oklch(0_0_0/0.06)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={spring.liquid}
        />
      </div>
      {range ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Typical for their weight: about {range.low}–{range.high} oz a day. Every baby is different —
          your pediatrician knows best.
        </p>
      ) : null}
    </section>
  );
}
