"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, m } from "motion/react";
import { useTheme } from "@/components/theme/theme-provider";
import { BabyMascot, type MascotMood } from "@/components/mascot/baby-mascot";
import { LottiePlayer, prefetchLottie } from "@/components/lottie/lottie-player";
import { LOTTIE, type LottieKey } from "@/components/lottie/lottie-assets";
import { ParticleBurst } from "./particle-burst";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";

type Origin = { x: number; y: number };

export type CelebrateOptions = {
  /** Where the burst springs from (defaults to screen centre-bottom). */
  origin?: Origin | DOMRect | Element | null;
  /** One-word speech bubble for the mascot pop. */
  word?: string;
  mood?: MascotMood;
  /** Particle tint (e.g. a kind's cssVar). */
  color?: string;
};

type Kind = "log" | "milestone" | "growth" | "first";

type Celebrate = (kind: Kind, opts?: CelebrateOptions) => void;

const CelebrateContext = createContext<Celebrate>(() => {});

export function useCelebrate(): Celebrate {
  return useContext(CelebrateContext);
}

function toOrigin(o: CelebrateOptions["origin"]): Origin {
  if (!o) {
    return { x: window.innerWidth / 2, y: window.innerHeight - 120 };
  }
  if (o instanceof Element) o = o.getBoundingClientRect();
  if ("width" in o) return { x: o.left + o.width / 2, y: o.top + o.height / 2 };
  return o;
}

const LOTTIE_FOR: Partial<Record<Kind, LottieKey>> = {
  milestone: "milestone-star",
  growth: "growth-sparkle",
  first: "confetti-soft",
};

/**
 * One place that decides how loud a celebration is:
 * - routine logs → a particle burst + the baby popping up with a word
 * - milestones / growth / first log of the day → a Lottie moment
 * - night theme → the mascot pop only (no confetti at 3am)
 */
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  const [bursts, setBursts] = useState<{ id: number; origin: Origin; color?: string }[]>([]);
  const [pop, setPop] = useState<{ id: number; word: string; mood: MascotMood } | null>(null);
  const [lottie, setLottie] = useState<{ id: number; key: LottieKey } | null>(null);
  const seq = useRef(0);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    prefetchLottie();
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    };
  }, []);

  const celebrate = useCallback<Celebrate>(
    (kind, opts = {}) => {
      const id = ++seq.current;
      const night = resolved === "night";
      haptic(kind === "log" ? "success" : "success");

      if (!night && kind === "log") {
        setBursts((b) => [...b.slice(-3), { id, origin: toOrigin(opts.origin), color: opts.color }]);
      }

      setPop({ id, word: opts.word ?? "Yay!", mood: opts.mood ?? "happy" });
      if (popTimer.current) clearTimeout(popTimer.current);
      popTimer.current = setTimeout(() => setPop(null), 1700);

      const lk = LOTTIE_FOR[kind];
      if (lk && !night) setLottie({ id, key: lk });
    },
    [resolved],
  );

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}

      {bursts.map((b) => (
        <ParticleBurst
          key={b.id}
          x={b.origin.x}
          y={b.origin.y}
          color={b.color}
          onDone={() => setBursts((all) => all.filter((x) => x.id !== b.id))}
        />
      ))}

      <AnimatePresence>
        {pop ? <MascotPop key="pop" word={pop.word} mood={pop.mood} popId={pop.id} dim={resolved === "night"} /> : null}
      </AnimatePresence>

      {lottie ? (
        <div
          key={lottie.id}
          aria-hidden
          data-print-hide
          className="pointer-events-none fixed inset-0 z-[85] grid place-items-center"
        >
          <LottiePlayer
            src={LOTTIE[lottie.key].src}
            fallback={LOTTIE[lottie.key].fallback}
            onComplete={() => setLottie(null)}
            className="h-64 w-64"
          />
        </div>
      ) : null}
    </CelebrateContext.Provider>
  );
}

/** The baby springs up from behind the bottom nav with a one-word bubble. */
function MascotPop({
  word,
  mood,
  popId,
  dim,
}: {
  word: string;
  mood: MascotMood;
  popId: number;
  dim: boolean;
}) {
  return (
    <m.div
      aria-hidden
      data-print-hide
      className="pointer-events-none fixed z-[25] left-1/2 bottom-[calc(env(safe-area-inset-bottom)+2.75rem)] md:bottom-4 md:left-auto md:right-8"
      initial={{ y: 110, x: "-50%", opacity: 1 }}
      animate={{ y: 0, x: "-50%", opacity: dim ? 0.85 : 1 }}
      exit={{ y: 110, x: "-50%", transition: { duration: 0.3, ease: "easeIn" } }}
      transition={spring.pop}
    >
      <div className="relative flex flex-col items-center">
        <AnimatePresence mode="popLayout">
          <m.span
            key={popId}
            initial={{ scale: 0, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ ...spring.pop, delay: 0.12 }}
            className="relative mb-1 rounded-full bg-card px-3 py-1 font-display text-sm font-semibold shadow-pop ring-1 ring-border/60 whitespace-nowrap"
          >
            {word}
            <span className="absolute left-1/2 -bottom-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-card ring-1 ring-border/60 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
          </m.span>
        </AnimatePresence>
        <BabyMascot mood={mood} size={84} />
      </div>
    </m.div>
  );
}
