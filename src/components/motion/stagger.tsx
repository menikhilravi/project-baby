"use client";

import { Children, type ReactNode } from "react";
import { m } from "motion/react";
import { fadeUp, stagger } from "@/lib/motion";

/**
 * Children rise in one after another on mount. Motion only reads `initial`
 * on mount, so revalidations never replay it; a child added later fades in
 * on its own.
 */
export function StaggerList({
  children,
  className,
  gap = 0.05,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  return (
    <m.div className={className} variants={stagger(gap, delay)} initial="hidden" animate="show">
      {Children.map(children, (child) =>
        child == null || child === false ? null : <m.div variants={fadeUp}>{child}</m.div>,
      )}
    </m.div>
  );
}
