'use client';

import { useState, useTransition } from "react";
import { Heart, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NameEntry } from "@/data/names";
import { recordSwipe, generateMoreNames } from "../actions";

const LOW_THRESHOLD = 5;

export function NameDeck({
  pool: initialPool,
  totalCount: initialTotal,
  seenCount,
}: {
  pool: NameEntry[];
  totalCount: number;
  seenCount: number;
}) {
  const [pool, setPool] = useState(initialPool);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"like" | "pass" | null>(null);
  const [animating, setAnimating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [_, startTransition] = useTransition();

  const remaining = pool.length - index;
  const exhausted = remaining <= 0;
  const current = pool[index];
  const upcoming = pool[index + 1];
  const showGeneratePrompt = !generating && remaining <= LOW_THRESHOLD;

  const handle = (verdict: "like" | "pass") => {
    if (animating || exhausted) return;
    const swiped = current;
    setDirection(verdict);
    setAnimating(true);
    startTransition(() => {
      recordSwipe(swiped.name, verdict).catch((e) => {
        console.error("Swipe failed:", e);
      });
    });
    setTimeout(() => {
      setIndex((i) => i + 1);
      setDirection(null);
      setAnimating(false);
    }, 280);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newNames = await generateMoreNames();
      if (newNames.length > 0) {
        setPool((p) => [...p, ...newNames]);
        setTotalCount((t) => t + newNames.length);
      }
    } catch (e) {
      console.error("Generate failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  if (exhausted) {
    return (
      <div className="w-full max-w-xs aspect-[3/4] rounded-3xl border-2 border-dashed border-border/60 grid place-items-center text-center px-6">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl">🎉</span>
          <div>
            <h2 className="font-display text-xl font-semibold">
              You&apos;ve seen them all
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Visit your favorites, or generate a fresh batch.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-full bg-names hover:bg-names/90 text-white px-5 gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating…" : "Generate more names"}
          </Button>
        </div>
      </div>
    );
  }

  const seenAfter = seenCount + index;

  return (
    <>
      <div className="relative w-full max-w-xs aspect-[3/4] mt-2">
        {upcoming ? (
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl bg-card/70 ring-1 ring-border/60 shadow-sm scale-[0.94] translate-y-3 opacity-70"
          >
            <div className="h-full grid place-items-center">
              <span className="font-display text-2xl text-muted-foreground/60">
                {upcoming.name}
              </span>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "absolute inset-0 rounded-3xl overflow-hidden ring-1 ring-border/60 shadow-xl transition-all duration-300 ease-out",
            "bg-gradient-to-br from-names-soft via-rewards-soft/70 to-gear-soft/60",
            animating && direction === "like" &&
              "translate-x-12 -translate-y-2 rotate-6 opacity-0",
            animating && direction === "pass" &&
              "-translate-x-12 -translate-y-2 -rotate-6 opacity-0",
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(at_30%_20%,oklch(1_0_0/0.5),transparent_55%)] pointer-events-none" />
          <Sparkles className="absolute top-5 right-5 h-4 w-4 text-names/70" />

          <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[10px] uppercase tracking-[0.22em] text-names/80 font-medium">
              {current.origin}
            </span>
            <h2 className="font-display mt-2 text-5xl md:text-6xl font-semibold tracking-tight text-foreground">
              {current.name}
            </h2>
            <p className="mt-4 text-sm text-foreground/70 italic max-w-[16rem]">
              &ldquo;{current.meaning}&rdquo;
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center gap-8">
        <Button
          onClick={() => handle("pass")}
          size="icon"
          variant="outline"
          aria-label="Pass"
          className="h-16 w-16 rounded-full border-2 bg-card/80 hover:bg-card hover:border-foreground/40 hover:text-foreground hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          <X className="h-7 w-7" />
        </Button>
        <Button
          onClick={() => handle("like")}
          size="icon"
          aria-label="Like"
          className="h-16 w-16 rounded-full bg-names hover:bg-names/90 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Heart className="h-7 w-7 fill-current" />
        </Button>
      </div>

      <p className="mt-5 text-xs text-muted-foreground tabular-nums">
        {String(seenAfter + 1).padStart(2, "0")} / {String(totalCount).padStart(2, "0")}
      </p>

      {showGeneratePrompt && (
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant="ghost"
          size="sm"
          className="mt-3 rounded-full text-names hover:bg-names-soft gap-1.5 text-xs"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {generating ? "Generating…" : "✨ Generate more names"}
        </Button>
      )}
    </>
  );
}
