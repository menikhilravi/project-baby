"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";

type Props = ComponentPropsWithoutRef<typeof m.button> & {
  /** How far it squishes on press (default 0.94). */
  squish?: number;
};

/** A button that squishes on press with a spring and a light haptic tap. */
export const Pressable = forwardRef<HTMLButtonElement, Props>(function Pressable(
  { className, squish = 0.94, onPointerDown, type = "button", ...props },
  ref,
) {
  return (
    <m.button
      ref={ref}
      type={type}
      whileTap={{ scale: squish }}
      transition={spring.squish}
      onPointerDown={(e) => {
        haptic("tap");
        onPointerDown?.(e);
      }}
      className={cn("touch-manipulation select-none outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong", className)}
      {...props}
    />
  );
});
