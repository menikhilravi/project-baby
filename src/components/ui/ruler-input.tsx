"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { haptic } from "@/lib/haptics";

const TICK_PX = 10;

/**
 * A measuring-tape input: scroll (or drag) the ruler under the centre line to
 * pick a value. Ticks are a CSS gradient, so even 600 steps cost no DOM nodes.
 * The number above is a real input for typing, and the ruler is an ARIA slider
 * with arrow / Page keys.
 */
export function RulerInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  majorEvery = 10,
  decimals = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** A labelled long tick every N steps. */
  majorEvery?: number;
  decimals?: number;
  hint?: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fromScroll = useRef(false);
  // Half the visible width, so the first and last ticks can reach the needle.
  const [gutter, setGutter] = useState(160);
  const steps = Math.round((max - min) / step);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => +(Math.round(clamp(v) / step) * step).toFixed(decimals);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setGutter(el.clientWidth / 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the tape under the value when it changes from outside (typing, keys).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    el.scrollLeft = ((value - min) / step) * TICK_PX;
  }, [value, min, step, gutter]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const next = snap(min + Math.round(el.scrollLeft / TICK_PX) * step);
    if (next !== value) {
      fromScroll.current = true;
      haptic("tick");
      onChange(next);
    }
    if (settling.current) clearTimeout(settling.current);
    settling.current = setTimeout(() => {
      // Settle exactly on a tick once the fling stops.
      el.scrollTo({ left: Math.round(el.scrollLeft / TICK_PX) * TICK_PX, behavior: "smooth" });
    }, 120);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = step * majorEvery;
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? step
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -step
          : e.key === "PageUp"
            ? big
            : e.key === "PageDown"
              ? -big
              : 0;
    if (!delta) return;
    e.preventDefault();
    onChange(snap(value + delta));
  };

  const labels: number[] = [];
  for (let i = 0; i <= steps; i += majorEvery) labels.push(+(min + i * step).toFixed(decimals));

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="flex items-baseline gap-1">
          <input
            type="number"
            inputMode="decimal"
            aria-label={`${label} in ${unit}`}
            value={value}
            step={step}
            min={min}
            max={max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
            className="w-28 rounded-xl bg-transparent text-right font-display text-3xl font-semibold nums outline-none focus-visible:bg-muted"
          />
          <span className="text-sm font-bold text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="relative">
        <div
          ref={scroller}
          role="slider"
          tabIndex={0}
          aria-label={`${label} ruler`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value} ${unit}`}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          className="no-scrollbar overflow-x-auto overscroll-x-contain rounded-2xl bg-muted py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong [scrollbar-width:none]"
        >
          <div className="flex w-max">
          <span aria-hidden className="shrink-0" style={{ width: gutter }} />
          <div
            className="relative h-14 shrink-0"
            style={{
              width: steps * TICK_PX,
              backgroundImage: [
                `repeating-linear-gradient(90deg, color-mix(in oklab, var(--foreground) 45%, transparent) 0 2px, transparent 2px ${TICK_PX * majorEvery}px)`,
                `repeating-linear-gradient(90deg, color-mix(in oklab, var(--foreground) 22%, transparent) 0 1px, transparent 1px ${TICK_PX}px)`,
              ].join(","),
              backgroundSize: `${steps * TICK_PX + 2}px 26px, ${steps * TICK_PX + 2}px 14px`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "0 0, 0 0",
            }}
          >
            {labels.map((l, i) => (
              <span
                key={l}
                className="absolute bottom-0 -translate-x-1/2 text-[11px] font-bold text-muted-foreground nums"
                style={{ left: i * majorEvery * TICK_PX + 1 }}
              >
                {l}
              </span>
            ))}
          </div>
          <span aria-hidden className="shrink-0" style={{ width: gutter }} />
          </div>
        </div>
        {/* centre needle */}
        <span aria-hidden className="pointer-events-none absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-accent-baby-strong shadow-[0_0_0_3px_var(--card)]" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-2xl bg-gradient-to-r from-muted to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-muted to-transparent" />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
