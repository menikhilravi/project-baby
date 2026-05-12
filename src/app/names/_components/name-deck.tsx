'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { Heart, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NameEntry } from "@/data/names";
import { recordSwipe, generateMoreNames } from "../actions";

const SWIPE_THRESHOLD = 80;

export function NameDeck({
  pool: initialPool,
  totalCount: initialTotal,
  seenCount,
}: {
  pool: NameEntry[];
  totalCount: number;
  seenCount: number;
}) {
  // React state — only for things that need to trigger re-renders
  const [pool, setPool] = useState(initialPool);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [index, setIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [hint, setHint] = useState("");
  const [showHintInput, setShowHintInput] = useState(false);
  const [, startTransition] = useTransition();

  // Always-current mirrors of state — safe to read inside callbacks without stale closure issues
  const poolRef = useRef(pool);
  const indexRef = useRef(0);
  poolRef.current = pool;
  indexRef.current = index;

  // Drag/commit state — never triggers re-renders
  const committingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragXRef = useRef(0);

  // DOM refs
  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);

  const remaining = pool.length - index;
  const exhausted = remaining <= 0;
  const current = pool[index];
  const upcoming = pool[index + 1];

  // Set initial cursor once on mount
  useEffect(() => {
    if (cardRef.current) cardRef.current.style.cursor = "grab";
  }, []);

  // Apply transform + overlay opacity directly to DOM during drag
  const applyDrag = useCallback((dx: number) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `translateX(${dx}px) rotate(${dx * 0.08}deg)`;
    const op = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1).toFixed(3);
    if (likeRef.current) likeRef.current.style.opacity = dx > 5 ? op : "0";
    if (passRef.current) passRef.current.style.opacity = dx < -5 ? op : "0";
  }, []);

  const commit = useCallback((v: "like" | "pass") => {
    // Read current values from refs — never from stale closures
    const currPool = poolRef.current;
    const currIndex = indexRef.current;
    const currCard = currPool[currIndex];
    if (committingRef.current || currIndex >= currPool.length || !currCard) return;

    committingRef.current = true;
    isDraggingRef.current = false;

    const card = cardRef.current;
    if (card) {
      card.style.cursor = "default";
      card.style.transition = "transform 280ms ease-out, opacity 280ms ease-out";
      card.style.transform = `translateX(${v === "like" ? 500 : -500}px) rotate(${v === "like" ? 18 : -18}deg)`;
      card.style.opacity = "0";
    }
    if (v === "like" && likeRef.current) likeRef.current.style.opacity = "1";
    if (v === "pass" && passRef.current) passRef.current.style.opacity = "1";

    startTransition(() => {
      recordSwipe(currCard.name, v).catch(console.error);
    });

    setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.removeProperty("transform");
        cardRef.current.style.removeProperty("opacity");
        cardRef.current.style.removeProperty("transition");
        cardRef.current.style.cursor = "grab";
      }
      if (likeRef.current) likeRef.current.style.opacity = "0";
      if (passRef.current) passRef.current.style.opacity = "0";
      dragXRef.current = 0;
      committingRef.current = false;
      setIndex(currIndex + 1);
    }, 290);
  }, [applyDrag, startTransition]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (committingRef.current || indexRef.current >= poolRef.current.length) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    dragXRef.current = 0;
    isDraggingRef.current = true;
    const card = cardRef.current;
    if (card) {
      card.style.transition = "none";
      card.style.cursor = "grabbing";
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartX.current;
    dragXRef.current = dx;
    applyDrag(dx);
  }, [applyDrag]);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const card = cardRef.current;
    if (card) card.style.cursor = "grab";
    const dx = dragXRef.current;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      commit(dx > 0 ? "like" : "pass");
    } else {
      if (card) {
        card.style.transition = "transform 300ms ease-out";
        card.style.transform = "translateX(0) rotate(0deg)";
      }
      if (likeRef.current) likeRef.current.style.opacity = "0";
      if (passRef.current) passRef.current.style.opacity = "0";
      dragXRef.current = 0;
    }
  }, [commit]);

  const handleGenerate = async () => {
    setGenerating(true);
    setShowHintInput(false);
    try {
      const newNames = await generateMoreNames(hint || undefined);
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
        <div className="flex flex-col items-center gap-4 w-full">
          <span className="text-4xl">🎉</span>
          <div>
            <h2 className="font-display text-xl font-semibold">You&apos;ve seen them all</h2>
            <p className="mt-1 text-sm text-muted-foreground">Generate a fresh batch with Gemini AI.</p>
          </div>
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder={"Preferences (optional)\ne.g. starts with V, 4-5 letters…"}
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-names/40 resize-none"
          />
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-full bg-names hover:bg-names/90 text-white px-5 gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate 20 names"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full max-w-xs aspect-[3/4] mt-2">
        {upcoming && (
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl bg-card/70 ring-1 ring-border/60 shadow-sm scale-[0.94] translate-y-3 opacity-70"
          />
        )}

        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none", willChange: "transform" }}
          className="absolute inset-0 rounded-3xl overflow-hidden ring-1 ring-border/60 shadow-xl bg-gradient-to-br from-names-soft via-rewards-soft/70 to-gear-soft/60 select-none"
        >
          {/* Overlays — always in DOM, opacity driven imperatively */}
          <div
            ref={likeRef}
            style={{ opacity: 0 }}
            className="absolute inset-0 bg-green-500/15 rounded-3xl flex items-start justify-start p-6 z-10 pointer-events-none"
          >
            <div className="rounded-xl border-[3px] border-green-500 px-3 py-1 -rotate-12">
              <span className="text-green-500 font-black text-xl tracking-widest">LIKE</span>
            </div>
          </div>
          <div
            ref={passRef}
            style={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500/15 rounded-3xl flex items-start justify-end p-6 z-10 pointer-events-none"
          >
            <div className="rounded-xl border-[3px] border-red-500 px-3 py-1 rotate-12">
              <span className="text-red-500 font-black text-xl tracking-widest">NOPE</span>
            </div>
          </div>

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
          onClick={() => commit("pass")}
          size="icon"
          variant="outline"
          aria-label="Pass"
          className="h-16 w-16 rounded-full border-2 bg-card/80 hover:bg-card hover:border-foreground/40 hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          <X className="h-7 w-7" />
        </Button>
        <Button
          onClick={() => commit("like")}
          size="icon"
          aria-label="Like"
          className="h-16 w-16 rounded-full bg-names hover:bg-names/90 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Heart className="h-7 w-7 fill-current" />
        </Button>
      </div>

      <p className="mt-5 text-xs text-muted-foreground tabular-nums">
        {String(seenCount + index + 1).padStart(2, "0")} / {String(totalCount).padStart(2, "0")}
      </p>

      <div className="mt-3 flex flex-col items-center gap-2 w-full max-w-xs">
        {showHintInput && (
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder={"Preferences (optional)\ne.g. starts with V, 4-5 letters…"}
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-names/40 resize-none"
          />
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="ghost"
            size="sm"
            className="rounded-full text-names hover:bg-names-soft gap-1.5 text-xs"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? "Generating…" : "Generate with AI"}
          </Button>
          {!generating && (
            <button
              onClick={() => setShowHintInput((v) => !v)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {showHintInput ? "hide prefs" : "add prefs"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
