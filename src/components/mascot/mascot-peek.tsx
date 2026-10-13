"use client";

import { useRef } from "react";
import { m, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { BabyMascot } from "./baby-mascot";

type Edge = "top" | "right" | "bottom" | "left";

const HIDDEN: Record<Edge, { x?: string; y?: string; rotate: number }> = {
  top: { y: "-100%", rotate: 180 },
  bottom: { y: "100%", rotate: 0 },
  left: { x: "-100%", rotate: 90 },
  right: { x: "100%", rotate: -90 },
};

const SHOWN: Record<Edge, { x?: string; y?: string }> = {
  top: { y: "-45%" },
  bottom: { y: "40%" },
  left: { x: "-45%" },
  right: { x: "40%" },
};

/**
 * The baby peeks in from behind an edge of the parent (which should be
 * `relative overflow-hidden`) when it scrolls into view, then ducks back out
 * after a moment. Purely decorative.
 */
export function MascotPeek({
  edge = "right",
  size = 72,
  delay = 0.4,
  stay = 2.4,
  className,
}: {
  edge?: Edge;
  size?: number;
  delay?: number;
  /** Seconds visible before ducking away; 0 = stay. */
  stay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const hidden = HIDDEN[edge];
  const shown = SHOWN[edge];

  const keyframes = stay
    ? {
        x: hidden.x ? [hidden.x, shown.x!, shown.x!, hidden.x] : undefined,
        y: hidden.y ? [hidden.y, shown.y!, shown.y!, hidden.y] : undefined,
      }
    : { x: shown.x, y: shown.y };

  return (
    <div
      ref={ref}
      aria-hidden
      data-print-hide
      className={cn(
        "pointer-events-none absolute",
        edge === "right" && "right-0 top-1/2 -translate-y-1/2",
        edge === "left" && "left-0 top-1/2 -translate-y-1/2",
        edge === "top" && "top-0 left-1/2 -translate-x-1/2",
        edge === "bottom" && "bottom-0 left-1/2 -translate-x-1/2",
        className,
      )}
    >
      <m.div
        style={{ rotate: hidden.rotate }}
        initial={{ x: hidden.x ?? 0, y: hidden.y ?? 0 }}
        animate={inView ? keyframes : undefined}
        transition={
          stay
            ? { delay, duration: stay + 1.1, times: [0, 0.18, 0.82, 1], ease: "easeInOut" }
            : { delay, type: "spring", visualDuration: 0.5, bounce: 0.4 }
        }
      >
        <BabyMascot mood="peek" size={size} />
      </m.div>
    </div>
  );
}
