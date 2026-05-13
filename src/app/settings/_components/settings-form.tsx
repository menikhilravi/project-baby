"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updatePhase } from "../actions";

type Override = "" | "prenatal" | "postnatal";

const CHOICES: Array<{ value: Override; label: string }> = [
  { value: "", label: "Auto" },
  { value: "prenatal", label: "Pregnancy" },
  { value: "postnatal", label: "Baby" },
];

export function SettingsForm({
  initialBirthDate,
  initialOverride,
}: {
  initialBirthDate: string;
  initialOverride: Override;
}) {
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [override, setOverride] = useState<Override>(initialOverride);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    birthDate !== initialBirthDate || override !== initialOverride;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("birth_date", birthDate);
    fd.set("phase_override", override);
    startTransition(async () => {
      try {
        await updatePhase(fd);
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <Label htmlFor="birth_date" className="text-sm font-medium">
            Baby&apos;s birth date
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Once today is on/after this date, postnatal sections appear in your nav.
          </p>
        </div>
        <Input
          id="birth_date"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="rounded-xl max-w-xs"
        />
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <p className="text-sm font-medium">Phase</p>
          <p className="text-xs text-muted-foreground mt-1">
            Auto follows the birth date above. Override to pin a mode.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((c) => {
            const checked = override === c.value;
            return (
              <button
                key={c.value || "auto"}
                type="button"
                onClick={() => setOverride(c.value)}
                aria-pressed={checked}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border bg-card/60 px-3 py-2.5 text-sm transition-all",
                  "hover:bg-card",
                  checked &&
                    "border-foreground/40 bg-muted/60 font-medium ring-1 ring-foreground/10",
                )}
              >
                {checked ? <Check className="h-3.5 w-3.5" /> : null}
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <span
          className={cn(
            "text-xs tabular-nums",
            error
              ? "text-destructive"
              : pending
                ? "text-muted-foreground"
                : dirty
                  ? "text-muted-foreground"
                  : savedAt
                    ? "text-foreground/70"
                    : "text-muted-foreground/60",
          )}
        >
          {error
            ? error
            : pending
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : savedAt
                  ? "Saved"
                  : "Up to date"}
        </span>
        <Button
          type="submit"
          disabled={!dirty || pending}
          className="rounded-2xl"
        >
          Save
        </Button>
      </div>
    </form>
  );
}
