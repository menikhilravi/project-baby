"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Counts from the previous value to the new one. Writes textContent directly
 * (no React re-render per frame). Tabular figures keep the width stable; the
 * server renders the final value so there is no flash of 0.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  format,
  className,
  duration = 0.8,
}: {
  value: number;
  decimals?: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduced = useReducedMotion();
  const fmt = format ?? ((n: number) => n.toFixed(decimals));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (reduced || from === value) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
    // fmt is derived from props; value is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  return (
    <span ref={ref} className={cn("nums", className)}>
      {fmt(value)}
    </span>
  );
}
