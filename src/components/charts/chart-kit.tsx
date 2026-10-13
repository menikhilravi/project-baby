"use client";

import { useRef, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Shared bits for every recharts view so charts read as one system:
 * a card shell, per-kind gradient fills, an in-view entrance animation and a
 * soft tooltip. Recharts draws the bars/lines; this only styles them.
 */

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-border/60 bg-card p-4 shadow-soft", className)}>
      <div className="mb-3 flex items-start gap-3 px-1">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const GRADIENT_KINDS = ["feed", "diaper", "sleep", "temp", "med", "pump", "tummy", "milestone"] as const;

/** Place inside a recharts chart; reference as fill="url(#g-feed)". */
export function ChartGradients({ extra }: { extra?: Record<string, string> }) {
  const entries: [string, string][] = [
    ...GRADIENT_KINDS.map((k) => [k, `var(--kind-${k})`] as [string, string]),
    ["accent", "var(--accent-baby)"],
    ...Object.entries(extra ?? {}),
  ];
  return (
    <defs>
      {entries.map(([id, color]) => (
        <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.55} />
        </linearGradient>
      ))}
    </defs>
  );
}

/**
 * Charts animate in once, when scrolled into view, and never for
 * reduced-motion users. Spread `anim` onto Bars/Lines/Areas.
 */
export function useChartAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  return {
    ref,
    inView: inView || Boolean(reduced),
    anim: {
      isAnimationActive: !reduced,
      animationDuration: 700,
      animationEasing: "ease-out" as const,
    },
  };
}

type TooltipPayload = { name?: string | number; value?: number | string; color?: string; dataKey?: string | number };

/** Squishy tooltip; pass as <Tooltip content={<ChartTooltip />} />. */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  format?: (value: number | string, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-popover px-3 py-2 text-xs shadow-pop ring-1 ring-border/70">
      {label != null ? <p className="mb-1 font-bold">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{String(p.name ?? p.dataKey)}</span>
            <span className="ml-auto pl-3 font-bold nums">
              {format && p.value != null ? format(p.value, String(p.name)) : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}
