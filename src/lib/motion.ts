/**
 * Shared motion vocabulary. Every spring in the app comes from here so the
 * whole UI moves with one personality: quick, a little bouncy, never floaty.
 */
import type { Transition, Variants } from "motion/react";

export const spring = {
  /** UI chrome: pills, indicators, toggles. */
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.8 },
  /** Press feedback on tiles and buttons. */
  squish: { type: "spring", visualDuration: 0.28, bounce: 0.45 },
  /** Cards and content settling into place. */
  gentle: { type: "spring", visualDuration: 0.5, bounce: 0.15 },
  /** Celebrations and pop-ins. */
  pop: { type: "spring", visualDuration: 0.38, bounce: 0.55 },
  /** Liquids: a heavier, slower settle. */
  liquid: { type: "spring", visualDuration: 0.7, bounce: 0.22 },
} satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring.gentle },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: spring.pop },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

export function stagger(gap = 0.045, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
  };
}

export const tapScale = { scale: 0.94 } as const;
