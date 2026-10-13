"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

/**
 * SVG progress ring. `value` is 0–1 (clamped); the arc springs to it. Colour
 * is any CSS colour (usually a kind token var). Children render centred.
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  color = "var(--accent-baby)",
  trackColor = "color-mix(in oklab, var(--foreground) 7%, transparent)",
  label,
  children,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn("relative grid place-items-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(clamped, 0.001) }}
          transition={spring.liquid}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
