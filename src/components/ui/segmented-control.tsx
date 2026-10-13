"use client";

import { useId, useRef, type ReactNode, type KeyboardEvent } from "react";
import { LayoutGroup, m } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Accessible label when `label` is icon-only. */
  ariaLabel?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T, event?: { x: number; y: number }) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Tailwind classes for the sliding pill (defaults to a card surface). */
  pillClassName?: string;
};

/**
 * Radio-group semantics with a spring pill that slides between options.
 * Arrow keys move selection (roving tabindex), matching native radios.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
  pillClassName,
}: Props<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number, el?: HTMLElement | null) => {
    const opt = options[i];
    if (!opt || opt.value === value) return;
    haptic("tick");
    const r = el?.getBoundingClientRect();
    onChange(opt.value, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + options.length) % options.length;
    refs.current[next]?.focus();
    select(next, refs.current[next]);
  };

  return (
    <LayoutGroup id={id}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "relative inline-flex w-full items-stretch gap-1 rounded-full bg-muted p-1",
          className,
        )}
      >
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.ariaLabel}
              tabIndex={active ? 0 : -1}
              onClick={(e) => select(i, e.currentTarget)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-accent-baby-strong",
                size === "sm" && "h-8 px-3 text-xs",
                size === "md" && "h-10 px-3 text-sm",
                size === "lg" && "h-12 px-4 text-[15px]",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <m.span
                  layoutId="segment-pill"
                  transition={spring.snappy}
                  className={cn(
                    "absolute inset-0 rounded-full bg-card shadow-soft",
                    pillClassName,
                  )}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {opt.icon}
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
