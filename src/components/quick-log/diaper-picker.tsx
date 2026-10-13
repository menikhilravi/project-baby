"use client";

import { Pressable } from "@/components/ui/pressable";
import type { DiaperSubtype } from "@/lib/baby-events";
import { useQuickLog } from "./use-quick-log";

function Drop({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -14 C 6 -6 10 -1 10 5 a 10 10 0 0 1 -20 0 c 0 -6 4 -11 10 -19 z" fill="var(--diaper-pee)" />
      <ellipse cx="-3.5" cy="3" rx="2.4" ry="3.6" fill="white" opacity="0.55" />
    </g>
  );
}

function Swirl({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="9" rx="14" ry="5.5" fill="var(--diaper-poop)" />
      <ellipse cx="0" cy="3" rx="10.5" ry="5" fill="var(--diaper-poop)" />
      <ellipse cx="0" cy="-2.5" rx="7" ry="4.2" fill="var(--diaper-poop)" />
      <path d="M-1 -10 q 5 1 2 5" stroke="var(--diaper-poop)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <circle cx="-3.5" cy="3" r="1.3" fill="white" opacity="0.8" />
      <circle cx="3.5" cy="3" r="1.3" fill="white" opacity="0.8" />
    </g>
  );
}

const OPTIONS: { value: DiaperSubtype; label: string; art: React.ReactNode }[] = [
  { value: "pee", label: "Wet", art: <Drop s={1.4} /> },
  { value: "poop", label: "Dirty", art: <Swirl s={1.3} /> },
  {
    value: "both",
    label: "Both",
    art: (
      <>
        <Drop x={-9} y={-3} s={1} />
        <Swirl x={9} y={4} s={0.95} />
      </>
    ),
  },
];

/** Three big illustrated buttons — one tap logs and closes. */
export function DiaperPicker({ onDone }: { onDone?: () => void }) {
  const { logDiaper } = useQuickLog();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onClick={(e) => {
              void logDiaper(o.value, e.currentTarget);
              onDone?.();
            }}
            className="flex flex-col items-center gap-2 rounded-tile bg-kind-diaper-soft px-2 pt-5 pb-4 shadow-squish"
          >
            <svg viewBox="-28 -24 56 48" className="h-14 w-16" aria-hidden>
              {o.art}
            </svg>
            <span className="font-display text-base font-semibold">{o.label}</span>
          </Pressable>
        ))}
      </div>
      <button
        type="button"
        onClick={(e) => {
          void logDiaper(null, e.currentTarget);
          onDone?.();
        }}
        className="mx-auto block h-11 rounded-full px-5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Just log a change
      </button>
    </div>
  );
}
