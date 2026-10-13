import { cn } from "@/lib/utils";

const STARS = [
  { x: 8, y: 18, s: 2, d: 0 },
  { x: 22, y: 62, s: 1.5, d: 1.2 },
  { x: 35, y: 28, s: 2.5, d: 0.6 },
  { x: 48, y: 74, s: 1.5, d: 2.1 },
  { x: 58, y: 14, s: 2, d: 1.6 },
  { x: 70, y: 48, s: 1.5, d: 0.3 },
  { x: 82, y: 22, s: 2.5, d: 2.4 },
  { x: 91, y: 66, s: 2, d: 0.9 },
  { x: 15, y: 86, s: 1.5, d: 1.9 },
  { x: 64, y: 88, s: 2, d: 2.8 },
];

/**
 * A deep-indigo sky with twinkling stars, a moon and a drifting cloud. Pure
 * CSS animation; stays dark in both themes because it *is* night.
 */
export function NightSky({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-print-hide
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        "bg-[radial-gradient(ellipse_at_80%_0%,oklch(0.36_0.08_285),transparent_60%),linear-gradient(180deg,oklch(0.24_0.06_275),oklch(0.2_0.05_285))]",
        className,
      )}
    >
      {STARS.map((st, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[oklch(0.95_0.03_90)] animate-twinkle"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s * 2,
            height: st.s * 2,
            animationDelay: `${st.d}s`,
          }}
        />
      ))}
      {/* moon */}
      <span className="absolute right-[9%] top-[14%] h-10 w-10 -rotate-12 rounded-full shadow-[inset_-9px_5px_0_0_oklch(0.95_0.05_90)] drop-shadow-[0_0_12px_oklch(0.9_0.06_90/0.35)]" />
      {/* drifting cloud */}
      <span className="absolute top-[58%] left-0 w-full animate-drift">
        <span className="block h-5 w-24 rounded-full bg-[oklch(0.95_0.01_280/0.08)] blur-[1px]" />
      </span>
    </div>
  );
}
