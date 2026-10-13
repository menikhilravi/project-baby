"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";

// lottie-web touches `window` at import — load on demand, client only. The
// "light" build has no expression engine (so no eval; fine under a strict
// CSP) and our animations don't use expressions.
const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.LottieLight), {
  ssr: false,
});

const cache = new Map<string, Promise<object>>();

function loadAnimation(src: string): Promise<object> {
  let p = cache.get(src);
  if (!p) {
    p = fetch(src).then((r) => {
      if (!r.ok) throw new Error(`Lottie ${src}: ${r.status}`);
      return r.json() as Promise<object>;
    });
    p.catch(() => cache.delete(src));
    cache.set(src, p);
  }
  return p;
}

/** Warm the lottie-react chunk and a JSON file during idle time. */
export function prefetchLottie(src?: string) {
  const run = () => {
    void import("lottie-react");
    if (src) void loadAnimation(src).catch(() => {});
  };
  if (typeof window === "undefined") return;
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (ric) ric(run);
  else setTimeout(run, 1200);
}

/**
 * Plays a Lottie JSON from /public. Renders `fallback` (a static SVG) while
 * loading, if loading fails, and always for reduced-motion users.
 */
export function LottiePlayer({
  src,
  loop = false,
  fallback,
  onComplete,
  className,
}: {
  src: string;
  loop?: boolean;
  fallback: ReactNode;
  onComplete?: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [data, setData] = useState<object | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    loadAnimation(src).then(
      (d) => alive && setData(d),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [src, reduced]);

  useEffect(() => {
    // Reduced motion: the fallback shows briefly, then completes like the animation would.
    if (!reduced || !onComplete) return;
    const t = setTimeout(onComplete, 1200);
    return () => clearTimeout(t);
  }, [reduced, onComplete]);

  if (reduced || failed || !data) {
    return <div className={className}>{fallback}</div>;
  }
  return (
    <Lottie
      src={data}
      loop={loop}
      autoplay
      subscriptions={onComplete ? { complete: onComplete } : undefined}
      className={className}
    />
  );
}
