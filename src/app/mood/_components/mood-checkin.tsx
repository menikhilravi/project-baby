"use client";

import { useState, useTransition } from "react";
import { LifeBuoy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  EPDS_QUESTIONS,
  interpretEpds,
  type EpdsResult,
} from "@/lib/epds";
import { submitMoodCheckin } from "../actions";

const BAND_STYLES: Record<EpdsResult["band"], string> = {
  low: "border-hospital/40 bg-hospital-soft",
  possible: "border-mood/40 bg-mood-soft",
  likely: "border-destructive/40 bg-destructive/10",
};

export function MoodCheckin() {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array(EPDS_QUESTIONS.length).fill(null),
  );
  const [result, setResult] = useState<EpdsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const answered = answers.filter((a) => a !== null).length;
  const complete = answered === EPDS_QUESTIONS.length;

  function choose(qIndex: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = value;
      return next;
    });
  }

  function submit() {
    if (!complete) return;
    const final = answers as number[];
    const interpreted = interpretEpds(final);
    setResult(interpreted);
    setError(null);
    startTransition(async () => {
      try {
        await submitMoodCheckin(final);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  function reset() {
    setAnswers(Array(EPDS_QUESTIONS.length).fill(null));
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <Card className={cn("border", BAND_STYLES[result.band])}>
        <CardContent className="space-y-3 py-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display nums text-4xl font-bold tracking-tight">
              {result.score}
            </span>
            <span className="text-sm text-muted-foreground">/ 30</span>
          </div>
          <p className="text-base font-semibold">{result.headline}</p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {result.guidance}
          </p>
          {result.selfHarmFlag ? (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <LifeBuoy className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                988 Suicide &amp; Crisis Lifeline (US) — call or text, any time.
              </span>
            </div>
          ) : null}
          {error ? (
            <p className="text-xs text-destructive">
              Saved locally but not synced: {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-mood hover:underline"
          >
            Take it again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        In the past 7 days…
      </p>
      {EPDS_QUESTIONS.map((q, qi) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium">
            {q.id}. {q.prompt}
          </p>
          <div className="flex flex-col gap-1.5">
            {q.options.map((opt) => {
              const selected = answers[qi] === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => choose(qi, opt.value)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-left text-sm transition-all active:scale-[0.99]",
                    selected
                      ? "border-mood/50 bg-mood-soft text-foreground"
                      : "border-border bg-card text-foreground/90 hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!complete || pending}
          className={cn(
            "rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background",
            "hover:opacity-90 active:scale-[0.98] disabled:opacity-40",
          )}
        >
          {pending ? "Saving…" : "See my check-in"}
        </button>
        <span className="text-xs text-muted-foreground">
          {answered}/{EPDS_QUESTIONS.length} answered
        </span>
      </div>
    </div>
  );
}
