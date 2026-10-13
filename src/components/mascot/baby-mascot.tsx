"use client";

import { useId, type CSSProperties } from "react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { ACCENT_HC, type Accent } from "@/lib/theme";
import { useBaby } from "@/components/providers/baby-context";
import {
  Accessory,
  Cheeks,
  Eyes,
  Hands,
  Head,
  INK,
  Mouth,
  Swaddle,
  Tuft,
  type EyeState,
  type MouthState,
} from "./mascot-parts";

export type MascotMood =
  | "idle"
  | "happy"
  | "sleeping"
  | "feeding"
  | "hungry"
  | "celebrate"
  | "peek";

const FACE: Record<MascotMood, { eyes: EyeState; mouth: MouthState }> = {
  idle: { eyes: "open", mouth: "smile" },
  happy: { eyes: "happy", mouth: "grin" },
  sleeping: { eyes: "closed", mouth: "pacifier" },
  feeding: { eyes: "closed", mouth: "smack" },
  hungry: { eyes: "wide", mouth: "smack" },
  celebrate: { eyes: "happy", mouth: "grin" },
  peek: { eyes: "peek", mouth: "o" },
};

const swap = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: spring.pop },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.12 } },
};

const boxStyle: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

/** Stable pseudo-random from a string, so SSR and client agree. */
function seeded(id: string, max: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h % 1000) / (1000 / max);
}

/**
 * The app's swaddled-bean baby. Idle loops (breathing, blinking, Zzz) are CSS
 * so they cost no JS and pause with the tab; mood changes animate with motion.
 * Fixed pixel size, so it never shifts layout.
 */
export function BabyMascot({
  mood = "idle",
  size = 96,
  variant,
  label,
  className,
}: {
  mood?: MascotMood;
  size?: number;
  /** Defaults to the current baby's accent. */
  variant?: Accent;
  /** Give it a label when it carries meaning; decorative otherwise. */
  label?: string;
  className?: string;
}) {
  const baby = useBaby();
  const accent = variant ?? baby.accent;
  const { h, c } = ACCENT_HC[accent];
  const id = useId();
  const blinkDelay = `${seeded(id, 4).toFixed(2)}s`;
  const face = FACE[mood];
  const bounce = mood === "celebrate" || mood === "happy";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 overflow-visible select-none", className)}
      style={{ "--m-h": h, "--m-c": c } as CSSProperties}
      data-print-hide
    >
      {/* soft ground shadow */}
      <ellipse cx="60" cy="116" rx="30" ry="3.5" fill={INK} opacity="0.08" />
      <m.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        animate={bounce ? { y: [0, -8, 0, -4, 0] } : { y: 0 }}
        transition={bounce ? { duration: 0.9, ease: "easeOut" } : spring.gentle}
        key={bounce ? `b-${mood}` : "still"}
      >
        <g className="animate-breathe origin-bottom-box">
          <Swaddle />
          <Head />
          {accent === "neutral" ? <Tuft /> : null}
          <Accessory variant={accent} />
          <Cheeks />

          <AnimatePresence mode="popLayout" initial={false}>
            <m.g key={`eyes-${face.eyes}`} style={boxStyle} {...swap}>
              {face.eyes === "open" || face.eyes === "wide" ? (
                <g className="animate-blink fill-box" style={{ animationDelay: blinkDelay }}>
                  <Eyes state={face.eyes} />
                </g>
              ) : (
                <Eyes state={face.eyes} />
              )}
            </m.g>
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            <m.g
              key={`mouth-${face.mouth}`}
              style={boxStyle}
              {...swap}
              {...(face.mouth === "smack"
                ? {
                    animate: {
                      opacity: 1,
                      scaleY: [1, 0.4, 1],
                      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 },
                    },
                  }
                : null)}
            >
              <Mouth state={face.mouth} />
            </m.g>
          </AnimatePresence>

          <AnimatePresence>
            {mood === "celebrate" || mood === "happy" ? (
              <m.g
                key="hands"
                style={boxStyle}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: mood === "celebrate" ? [0, -10, 10, -6, 0] : 0,
                }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ ...spring.pop, rotate: { duration: 0.8, ease: "easeInOut" } }}
              >
                <Hands />
              </m.g>
            ) : null}
          </AnimatePresence>
        </g>
      </m.g>

      {mood === "sleeping" ? <Zzz /> : null}
      {mood === "feeding" ? <FloatingHeart /> : null}
      {mood === "hungry" ? <MilkThought /> : null}
    </svg>
  );
}

function Zzz() {
  return (
    <g fill={INK} fontFamily="var(--font-display)" fontWeight="600" opacity="0.7">
      {[0, 0.9, 1.8].map((delay, i) => (
        <text
          key={i}
          x={88 + i * 5}
          y={34 - i * 4}
          fontSize={10 + i * 3}
          className="animate-float-z fill-box"
          style={{ animationDelay: `${delay}s` }}
        >
          z
        </text>
      ))}
    </g>
  );
}

function FloatingHeart() {
  return (
    <path
      d="M92 30 c -3 -5 -10 -2 -8 3 c 1 3 8 8 8 8 s 7 -5 8 -8 c 2 -5 -5 -8 -8 -3 z"
      fill="oklch(0.75 0.14 15)"
      className="animate-float-z fill-box"
    />
  );
}

/** A tiny thought bubble with a milk drop — "I could eat". */
function MilkThought() {
  return (
    <m.g
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.pop}
      style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
    >
      <circle cx="90" cy="34" r="2" fill="var(--card)" stroke={INK} strokeOpacity="0.15" />
      <circle cx="96" cy="26" r="3" fill="var(--card)" stroke={INK} strokeOpacity="0.15" />
      <circle cx="106" cy="14" r="10" fill="var(--card)" stroke={INK} strokeOpacity="0.15" />
      <path d="M106 7 q 5 7 0 11 q -5 -4 0 -11 z" fill="var(--kind-feed)" />
    </m.g>
  );
}
