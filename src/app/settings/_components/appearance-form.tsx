"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { m } from "motion/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/theme-provider";
import { BabyMascot } from "@/components/mascot/baby-mascot";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { ACCENT_LABELS, resolveAccent, type Accent } from "@/lib/theme";
import { setBabyAccent } from "../actions";

type Choice = "auto" | Accent;

// Literal swatch colors per accent (the token only exists under data-accent).
const SWATCH: Record<Accent, string> = {
  neutral: "oklch(0.78 0.07 160)",
  boy: "oklch(0.78 0.09 238)",
  girl: "oklch(0.8 0.09 12)",
};

export function AppearanceForm({
  sex,
  initialOverride,
}: {
  sex: "male" | "female" | null;
  initialOverride: Accent | null;
}) {
  const { previewAccent } = useTheme();
  const [choice, setChoice] = useState<Choice>(initialOverride ?? "auto");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const autoAccent = resolveAccent(sex, null);
  const effective: Accent = choice === "auto" ? autoAccent : choice;

  const pick = (next: Choice) => {
    if (next === choice) return;
    haptic("tick");
    const prev = choice;
    setChoice(next);
    setError(null);
    previewAccent(next === "auto" ? autoAccent : next);
    startTransition(async () => {
      try {
        await setBabyAccent(next === "auto" ? null : next);
      } catch (err) {
        setChoice(prev);
        previewAccent(prev === "auto" ? autoAccent : prev);
        setError(err instanceof Error ? err.message : "Couldn't save");
      }
    });
  };

  const choices: { value: Choice; label: string; accent: Accent }[] = [
    { value: "auto", label: "Auto", accent: autoAccent },
    { value: "neutral", label: ACCENT_LABELS.neutral, accent: "neutral" },
    { value: "boy", label: ACCENT_LABELS.boy, accent: "boy" },
    { value: "girl", label: ACCENT_LABELS.girl, accent: "girl" },
  ];

  return (
    <section className="rounded-card border bg-card p-5 shadow-soft space-y-6">
      <div className="flex items-center gap-4">
        <div className="shrink-0 grid place-items-center h-20 w-20 rounded-3xl bg-accent-baby-soft">
          <BabyMascot mood="happy" size={64} variant={effective} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">Look &amp; feel</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Night is a soft, dim palette for 3am feeds. Auto follows your phone.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Theme</p>
        <ThemeToggle size="md" className="max-w-sm" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Accent color</p>
        <p className="text-xs text-muted-foreground">
          Auto picks a gentle tint from your baby&apos;s sex
          {sex ? "" : " (sage until it's set)"}. Only you see your choice.
        </p>
        <div role="radiogroup" aria-label="Accent color" className="grid grid-cols-4 gap-2 max-w-md pt-1">
          {choices.map((c) => {
            const active = choice === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending && !active}
                onClick={() => pick(c.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-xs font-semibold transition-colors",
                  active ? "border-transparent bg-accent-baby-soft text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className="relative grid place-items-center h-9 w-9 rounded-full ring-2 ring-card shadow-soft"
                  style={{ background: SWATCH[c.accent] }}
                >
                  {active ? (
                    <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.pop}>
                      <Check className="h-4 w-4 text-[oklch(0.25_0.03_285)]" strokeWidth={3} />
                    </m.span>
                  ) : null}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
