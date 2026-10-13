/**
 * Pure SVG parts for the swaddled-bean mascot, drawn on a 120×120 viewBox.
 * Colours come from CSS variables set on the parent <svg> (--m-h / --m-c for
 * the swaddle hue, --mascot-skin / --mascot-ink from the theme).
 */
import type { Accent } from "@/lib/theme";

export const SWADDLE = "oklch(0.9 calc(var(--m-c) * 0.95) var(--m-h))";
export const SWADDLE_SHADE = "oklch(0.82 calc(var(--m-c) * 1.3) var(--m-h))";
export const SWADDLE_RIM = "oklch(0.955 calc(var(--m-c) * 0.5) var(--m-h))";
export const SKIN = "var(--mascot-skin)";
export const INK = "var(--mascot-ink)";
export const CHEEK = "oklch(0.78 0.11 15 / 0.55)";

export type EyeState = "open" | "closed" | "happy" | "peek" | "wide";
export type MouthState = "smile" | "o" | "grin" | "pacifier" | "smack" | "flat";

/** Swaddle body + hood. The face sits inside the hood opening. */
export function Swaddle() {
  return (
    <g>
      {/* body */}
      <rect x="22" y="56" width="76" height="58" rx="32" fill={SWADDLE} />
      {/* blanket fold across the chest */}
      <path
        d="M30 78 C 48 70, 70 86, 92 74 L 94 88 C 74 98, 50 84, 28 94 Z"
        fill={SWADDLE_SHADE}
        opacity="0.7"
      />
      {/* a little embroidered heart on the blanket */}
      <path
        d="M60 103 c -2.4 -3.6 -7.4 -1.6 -5.6 2.2 c 1 2 5.6 5 5.6 5 s 4.6 -3 5.6 -5 c 1.8 -3.8 -3.2 -5.8 -5.6 -2.2 z"
        fill={SWADDLE_SHADE}
      />
      {/* hood */}
      <circle cx="60" cy="50" r="37" fill={SWADDLE} />
      <circle cx="60" cy="51" r="31" fill={SWADDLE_RIM} />
    </g>
  );
}

export function Head() {
  return (
    <g>
      <circle cx="60" cy="52" r="27" fill={SKIN} />
      {/* soft chin shadow so the face reads on pale swaddles */}
      <ellipse cx="60" cy="76" rx="16" ry="3" fill={INK} opacity="0.06" />
    </g>
  );
}

export function Tuft() {
  return (
    <path
      d="M58 27 c -2 -6 4 -10 8 -6 c -5 0 -6 4 -3 7"
      fill="none"
      stroke={INK}
      strokeWidth="2.6"
      strokeLinecap="round"
      opacity="0.75"
    />
  );
}

export function Cheeks() {
  return (
    <g>
      <ellipse cx="44" cy="62" rx="5.5" ry="3.6" fill={CHEEK} />
      <ellipse cx="76" cy="62" rx="5.5" ry="3.6" fill={CHEEK} />
    </g>
  );
}

/** Accessory per accent: knit-cap pom (boy), bow (girl), nothing (neutral). */
export function Accessory({ variant }: { variant: Accent }) {
  if (variant === "boy") {
    return (
      <g>
        <path d="M34 26 Q 60 6 86 26" stroke={SWADDLE_SHADE} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="12" r="6.5" fill={SWADDLE_SHADE} />
        <circle cx="58" cy="10" r="2" fill="white" opacity="0.5" />
      </g>
    );
  }
  if (variant === "girl") {
    return (
      <g transform="translate(84 22) rotate(18)">
        <path d="M0 0 L -11 -7 Q -13 0 -11 7 Z" fill={SWADDLE_SHADE} />
        <path d="M0 0 L 11 -7 Q 13 0 11 7 Z" fill={SWADDLE_SHADE} />
        <circle r="3.6" fill="oklch(0.74 calc(var(--m-c) * 1.8) var(--m-h))" />
      </g>
    );
  }
  return null;
}

export function Eyes({ state }: { state: EyeState }) {
  const stroke = { stroke: INK, strokeWidth: 2.8, strokeLinecap: "round" as const, fill: "none" };
  switch (state) {
    case "closed":
      return (
        <g>
          <path d="M44 53 q 5 4 10 0" {...stroke} />
          <path d="M66 53 q 5 4 10 0" {...stroke} />
        </g>
      );
    case "happy":
      return (
        <g>
          <path d="M44 55 q 5 -6 10 0" {...stroke} />
          <path d="M66 55 q 5 -6 10 0" {...stroke} />
        </g>
      );
    case "peek":
    case "open":
    case "wide": {
      const dx = state === "peek" ? 2.5 : 0;
      const ry = state === "wide" ? 4.6 : 4;
      return (
        <g>
          <ellipse cx={49 + dx} cy="53" rx="3.4" ry={ry} fill={INK} />
          <ellipse cx={71 + dx} cy="53" rx="3.4" ry={ry} fill={INK} />
          <circle cx={50.3 + dx} cy="51.4" r="1.2" fill="white" />
          <circle cx={72.3 + dx} cy="51.4" r="1.2" fill="white" />
        </g>
      );
    }
  }
}

export function Mouth({ state }: { state: MouthState }) {
  switch (state) {
    case "smile":
      return <path d="M55 64 q 5 5 10 0" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    case "grin":
      return <path d="M53 63 q 7 9 14 0 z" fill={INK} opacity="0.85" />;
    case "o":
      return <ellipse cx="60" cy="66" rx="2.8" ry="3.2" fill={INK} opacity="0.85" />;
    case "smack":
      return <ellipse cx="60" cy="66" rx="3.4" ry="2.2" fill={INK} opacity="0.8" />;
    case "flat":
      return <path d="M56 66 h 8" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
    case "pacifier":
      return (
        <g>
          <ellipse cx="60" cy="66" rx="7.5" ry="4.8" fill={SWADDLE_SHADE} />
          <circle cx="60" cy="66" r="2.6" fill="white" opacity="0.7" />
        </g>
      );
  }
}

export function Hands() {
  return (
    <g>
      <circle cx="26" cy="74" r="7" fill={SKIN} />
      <circle cx="94" cy="74" r="7" fill={SKIN} />
    </g>
  );
}
