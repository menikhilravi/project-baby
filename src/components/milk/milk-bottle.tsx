"use client";

import { useEffect, useId } from "react";
import { m, useSpring, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

// Geometry on a 100×180 viewBox.
const BODY = { x: 16, y: 52, w: 68, h: 118, r: 20 };
const BODY_BOTTOM = BODY.y + BODY.h;
const FILL_TOP = BODY.y + 8; // full bottle sits a little below the shoulder

/**
 * A baby bottle with real-feeling milk: the level springs to `level` (0–1),
 * the surface ripples, and a few bubbles rise. Liquid moves with transforms
 * only (never SVG height) so it stays smooth on old phones.
 */
export function MilkBottle({
  level,
  ticks = 8,
  tickLabels,
  className,
  levelValue,
  label,
}: {
  level: number;
  /** Number of graduation marks. */
  ticks?: number;
  /** Optional labels for every other tick (bottom → top). */
  tickLabels?: string[];
  className?: string;
  /** Drive the level from an external motion value (e.g. a pour). */
  levelValue?: MotionValue<number>;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const internal = useSpring(level, spring.liquid);
  useEffect(() => {
    internal.set(Math.max(0, Math.min(1, level)));
  }, [level, internal]);
  const source = levelValue ?? internal;
  const y = useTransform(source, (v) => BODY_BOTTOM - v * (BODY_BOTTOM - FILL_TOP));

  const usable = BODY_BOTTOM - FILL_TOP;
  return (
    <svg
      viewBox="0 0 100 180"
      className={cn("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={`body-${id}`}>
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} />
        </clipPath>
        <linearGradient id={`glass-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="white" stopOpacity="0.08" />
          <stop offset="1" stopColor="white" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`milk-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--milk)" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--milk) 86%, var(--kind-feed))" />
        </linearGradient>
      </defs>

      {/* nipple + collar */}
      <path
        d="M38 36 C 38 22, 44 8, 50 8 C 56 8, 62 22, 62 36 Z"
        fill="oklch(0.86 0.06 70)"
        stroke="oklch(0.74 0.07 65)"
        strokeWidth="1.5"
      />
      <rect x="24" y="32" width="52" height="22" rx="8" fill="var(--accent-baby)" />
      <rect x="24" y="32" width="52" height="6" rx="3" fill="white" opacity="0.25" />

      {/* glass body */}
      <rect
        x={BODY.x}
        y={BODY.y}
        width={BODY.w}
        height={BODY.h}
        rx={BODY.r}
        fill="color-mix(in oklab, var(--card) 70%, var(--accent-baby-soft))"
        stroke="color-mix(in oklab, var(--foreground) 14%, transparent)"
        strokeWidth="2"
      />

      {/* milk */}
      <g clipPath={`url(#body-${id})`}>
        <m.g style={{ y }}>
          <g className="animate-wave">
            <path
              d="M0 0 Q 12.5 -5 25 0 T 50 0 T 75 0 T 100 0 T 125 0 T 150 0 T 175 0 T 200 0 V 200 H 0 Z"
              fill={`url(#milk-${id})`}
            />
          </g>
          {[22, 46, 68].map((cx, i) => (
            <circle
              key={cx}
              cx={cx + 6}
              cy={60}
              r={i === 1 ? 2.4 : 1.8}
              fill="white"
              opacity="0.7"
              className="animate-bubble fill-box"
              style={{ animationDelay: `${i * 0.9}s` }}
            />
          ))}
        </m.g>
      </g>

      {/* graduations */}
      <g stroke="color-mix(in oklab, var(--foreground) 30%, transparent)" strokeWidth="1.6" strokeLinecap="round">
        {Array.from({ length: ticks }, (_, i) => {
          const ty = BODY_BOTTOM - ((i + 1) / ticks) * usable;
          const long = i % 2 === 1;
          return <line key={i} x1={BODY.x + BODY.w - 6} x2={BODY.x + BODY.w - (long ? 18 : 12)} y1={ty} y2={ty} />;
        })}
      </g>
      {tickLabels ? (
        <g
          fontSize="8"
          fontWeight="700"
          fill="color-mix(in oklab, var(--foreground) 45%, transparent)"
          textAnchor="end"
          fontFamily="var(--font-sans)"
        >
          {tickLabels.map((t, i) => {
            const idx = i * 2 + 1;
            if (idx >= ticks) return null;
            const ty = BODY_BOTTOM - ((idx + 1) / ticks) * usable;
            return (
              <text key={t} x={BODY.x + BODY.w - 21} y={ty + 3}>
                {t}
              </text>
            );
          })}
        </g>
      ) : null}

      {/* glass shine */}
      <rect
        x={BODY.x}
        y={BODY.y}
        width={BODY.w}
        height={BODY.h}
        rx={BODY.r}
        fill={`url(#glass-${id})`}
        pointerEvents="none"
      />
    </svg>
  );
}

export const BOTTLE_GEOMETRY = { BODY, BODY_BOTTOM, FILL_TOP, VIEW_H: 180, VIEW_W: 100 };
