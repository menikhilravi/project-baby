"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { updatePhase } from "../actions";

type Override = "" | "prenatal" | "postnatal";
type Sex = "" | "male" | "female";

// SegmentedControl needs non-empty values; map "" ↔ "auto"/"unknown".
const PHASE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "prenatal", label: "Pregnancy" },
  { value: "postnatal", label: "Baby" },
] as const;

const SEX_OPTIONS = [
  { value: "unknown", label: "Not set" },
  { value: "male", label: "Boy" },
  { value: "female", label: "Girl" },
] as const;

export function SettingsForm({
  initialName,
  initialBirthDate,
  initialOverride,
  initialSex,
  initialBirthWeightKg,
}: {
  initialName: string;
  initialBirthDate: string;
  initialOverride: Override;
  initialSex: Sex;
  initialBirthWeightKg: string;
}) {
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [override, setOverride] = useState<Override>(initialOverride);
  const [sex, setSex] = useState<Sex>(initialSex);
  const [birthWeightKg, setBirthWeightKg] = useState(initialBirthWeightKg);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    name !== initialName ||
    birthDate !== initialBirthDate ||
    override !== initialOverride ||
    sex !== initialSex ||
    birthWeightKg !== initialBirthWeightKg;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("baby_name", name);
    fd.set("birth_date", birthDate);
    fd.set("phase_override", override);
    fd.set("baby_sex", sex);
    fd.set(
      "birth_weight_g",
      birthWeightKg.trim() ? String(Math.round(Number(birthWeightKg) * 1000)) : "",
    );
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-card border bg-card p-5 shadow-soft space-y-5">
        <div className="space-y-2">
          <Label htmlFor="baby_name" className="text-sm font-semibold">
            Baby&apos;s name
          </Label>
          <p className="text-xs text-muted-foreground">
            Shown in the header and greetings. A nickname works too.
          </p>
          <Input
            id="baby_name"
            value={name}
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. Peanut"
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date" className="text-sm font-semibold">
            Birth or due date
          </Label>
          <p className="text-xs text-muted-foreground">
            Once today is on or after this date, the baby sections appear in your nav.
          </p>
          <Input
            id="birth_date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Baby&apos;s sex</p>
          <p className="text-xs text-muted-foreground">
            Picks the right WHO growth curves and a soft accent color. Shared with your partner.
          </p>
          <SegmentedControl
            label="Baby's sex"
            value={sex || "unknown"}
            onChange={(v) => setSex(v === "unknown" ? "" : v)}
            options={SEX_OPTIONS}
            className="max-w-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_weight" className="text-sm font-semibold">
            Birth weight (kg)
          </Label>
          <p className="text-xs text-muted-foreground">
            Used to track the first-2-week weight recovery in Reports.
          </p>
          <Input
            id="birth_weight"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="3.3"
            value={birthWeightKg}
            onChange={(e) => setBirthWeightKg(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </section>

      <section className="rounded-card border bg-card p-5 shadow-soft space-y-3">
        <div>
          <p className="text-sm font-semibold">Phase</p>
          <p className="text-xs text-muted-foreground mt-1">
            Auto follows the date above. Override to pin a mode.
          </p>
        </div>
        <SegmentedControl
          label="Phase"
          value={override || "auto"}
          onChange={(v) => setOverride(v === "auto" ? "" : v)}
          options={PHASE_OPTIONS}
        />
      </section>

      <div className="flex items-center justify-end gap-3">
        <span
          aria-live="polite"
          className={cn(
            "text-xs tabular-nums",
            error
              ? "text-destructive"
              : savedAt && !dirty && !pending
                ? "text-foreground/70"
                : "text-muted-foreground",
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
        <Button type="submit" variant="squish" size="lg" disabled={!dirty || pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
