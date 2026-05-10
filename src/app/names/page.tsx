"use client";

import { useState } from "react";
import { Heart, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/page-hero";
import { cn } from "@/lib/utils";

type NameEntry = { name: string; meaning: string; origin: string };

const namePool: NameEntry[] = [
  { name: "Olivia", meaning: "Olive tree, peace", origin: "Latin" },
  { name: "Liam", meaning: "Strong-willed warrior", origin: "Irish" },
  { name: "Aurora", meaning: "Dawn, new beginning", origin: "Latin" },
  { name: "Eli", meaning: "Ascended, my God", origin: "Hebrew" },
  { name: "Maya", meaning: "Water, illusion", origin: "Sanskrit" },
  { name: "Noah", meaning: "Rest, comfort", origin: "Hebrew" },
  { name: "Ada", meaning: "Noble, of nobility", origin: "Germanic" },
  { name: "Kai", meaning: "Sea", origin: "Hawaiian" },
];

export default function NamesPage() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"like" | "pass" | null>(null);
  const [animating, setAnimating] = useState(false);

  const current = namePool[index % namePool.length];
  const upcoming = namePool[(index + 1) % namePool.length];

  const handle = (verdict: "like" | "pass") => {
    if (animating) return;
    setDirection(verdict);
    setAnimating(true);
    setTimeout(() => {
      setIndex((i) => (i + 1) % namePool.length);
      setDirection(null);
      setAnimating(false);
    }, 280);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12 flex flex-col items-center">
      <div className="w-full">
        <PageHero
          tool="names"
          icon={Heart}
          eyebrow="Name Bracket"
          title="Find a name you love."
          subtitle="Tap to keep, tap to skip. Your favorites pile up over time."
        />
      </div>

      <div className="relative w-full max-w-xs aspect-[3/4] mt-2">
        {/* upcoming card peeking behind */}
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

        {/* main card */}
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
              “{current.meaning}”
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

      <p className="mt-5 text-xs text-muted-foreground">
        {((index % namePool.length) + 1).toString().padStart(2, "0")} of{" "}
        {namePool.length.toString().padStart(2, "0")}
      </p>
    </div>
  );
}
