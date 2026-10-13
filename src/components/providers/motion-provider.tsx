"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./motion-features").then((m) => m.default);

/**
 * `strict` makes importing the heavy `motion.*` components a runtime error, so
 * everything goes through the tiny `m.*` + lazily loaded features. Reduced
 * motion follows the OS setting: transforms are skipped, opacity still fades.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
