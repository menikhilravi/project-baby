"use client";

import { m } from "motion/react";

const COLORS = [
  "var(--kind-feed)",
  "var(--kind-milestone)",
  "var(--accent-baby)",
  "var(--kind-diaper)",
  "var(--kind-sleep)",
];

/**
 * ~12 soft dots and sparkles springing out of a point and fading. Rendered by
 * CelebrateProvider in a fixed overlay; `color` tints half of the particles.
 */
export function ParticleBurst({
  x,
  y,
  color,
  onDone,
}: {
  x: number;
  y: number;
  color?: string;
  onDone: () => void;
}) {
  const count = 12;
  return (
    <div className="pointer-events-none fixed z-[90]" style={{ left: x, top: y }} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.25 : 0);
        const dist = 38 + ((i * 7) % 4) * 9;
        const size = i % 3 === 0 ? 9 : 6;
        const fill = color && i % 2 === 0 ? color : COLORS[i % COLORS.length];
        const sparkle = i % 4 === 1;
        return (
          <m.span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 8,
              scale: [0.4, 1.15, 0.6],
              opacity: [1, 1, 0],
              rotate: sparkle ? 90 : 0,
            }}
            transition={{ duration: 0.65, ease: [0.2, 0.9, 0.3, 1] }}
            onAnimationComplete={i === 0 ? onDone : undefined}
          >
            {sparkle ? (
              <svg width={size + 4} height={size + 4} viewBox="-10 -10 20 20">
                <path d="M0 -10 C 1.5 -1.5 1.5 -1.5 10 0 C 1.5 1.5 1.5 1.5 0 10 C -1.5 1.5 -1.5 1.5 -10 0 C -1.5 -1.5 -1.5 -1.5 0 -10 z" fill={fill} />
              </svg>
            ) : (
              <span className="block rounded-full" style={{ width: size, height: size, background: fill }} />
            )}
          </m.span>
        );
      })}
    </div>
  );
}
