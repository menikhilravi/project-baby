"use client";

import { useState } from "react";
import { Clock, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MED_LABELS, MED_SUBTYPES, type MedSubtype } from "@/lib/baby-events";
import { defaultMedUnit } from "@/lib/med-schedule";
import { classifyTemp, feverAlert } from "@/lib/newborn-health";
import { EventEditor } from "@/app/log/_components/event-editor";
import { useBaby } from "@/components/providers/baby-context";
import { useQuickLog } from "./use-quick-log";

function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  format,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  label: string;
}) {
  const clamp = (v: number) => +Math.max(min, Math.min(max, v)).toFixed(2);
  return (
    <div className="flex items-center justify-center gap-5" role="group" aria-label={label}>
      <Button variant="soft" size="icon-lg" aria-label={`Lower ${label}`} onClick={() => onChange(clamp(value - step))}>
        <Minus />
      </Button>
      <output className="min-w-36 text-center font-display text-5xl font-semibold nums" aria-live="polite">
        {format(value)}
      </output>
      <Button variant="soft" size="icon-lg" aria-label={`Raise ${label}`} onClick={() => onChange(clamp(value + step))}>
        <Plus />
      </Button>
    </div>
  );
}

export function TempPicker({ onDone }: { onDone?: () => void }) {
  const { logTemperature } = useQuickLog();
  const { birthDate } = useBaby();
  const [unit, setUnit] = useState<"f" | "c">("f");
  const [value, setValue] = useState(98.6);

  const status = classifyTemp({ amount: value, unit });
  const alert =
    status === "fever" || status === "low"
      ? feverAlert({ amount: value, unit }, birthDate, new Date())
      : null;

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Unit"
        size="sm"
        value={unit}
        onChange={(u) => {
          setUnit(u);
          setValue(u === "f" ? 98.6 : 37.0);
        }}
        options={[
          { value: "f", label: "°F" },
          { value: "c", label: "°C" },
        ]}
        className="mx-auto w-36"
      />
      <Stepper
        label="temperature"
        value={value}
        onChange={setValue}
        step={0.1}
        min={unit === "f" ? 90 : 32}
        max={unit === "f" ? 108 : 42}
        format={(v) => `${v.toFixed(1)}°`}
      />
      {alert ? (
        <p
          role="alert"
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold",
            alert.urgent ? "bg-destructive/12 text-destructive" : "bg-kind-temp-soft text-kind-temp-strong",
          )}
        >
          {alert.status === "low"
            ? "That's low for a baby — call your pediatrician."
            : alert.urgent
              ? "Fever. Under 3 months this is urgent — call your pediatrician now."
              : "This is a fever — keep an eye on it and call if it climbs."}
        </p>
      ) : null}
      <Button
        variant="squish"
        size="xl"
        className="w-full"
        onClick={(e) => {
          void logTemperature(value, unit, e.currentTarget);
          onDone?.();
        }}
      >
        Log {value.toFixed(1)}°{unit.toUpperCase()}
      </Button>
    </div>
  );
}

/**
 * "Now" logs on tap (the 3am case); "Earlier" opens the full editor to set
 * the real time and dose of something given hours or days ago.
 */
export function MedPicker({ onDone }: { onDone?: () => void }) {
  const { logMedicine } = useQuickLog();
  const [when, setWhen] = useState<"now" | "earlier">("now");
  const [backdating, setBackdating] = useState<MedSubtype | null>(null);

  return (
    <div className="space-y-4">
      <SegmentedControl
        label="When"
        size="sm"
        value={when}
        onChange={setWhen}
        options={[
          { value: "now", label: "Just now" },
          { value: "earlier", label: "Earlier", icon: <Clock className="h-3.5 w-3.5" /> },
        ]}
        className="mx-auto w-56"
      />
      <div className="grid grid-cols-2 gap-3">
        {MED_SUBTYPES.map((s) => (
          <Pressable
            key={s}
            onClick={(e) => {
              if (when === "earlier") {
                setBackdating(s);
                return;
              }
              void logMedicine(s, e.currentTarget);
              onDone?.();
            }}
            className={cn(
              "flex min-h-16 flex-col items-start justify-center rounded-2xl px-4 py-3 text-left shadow-squish",
              s === "vitamin_d" ? "col-span-2 bg-kind-med-soft" : "bg-muted",
            )}
          >
            <span className="font-display text-base font-semibold">{MED_LABELS[s]}</span>
            {s === "vitamin_d" ? (
              <span className="text-xs font-semibold text-kind-med-strong">400 IU · daily drop</span>
            ) : null}
          </Pressable>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {when === "earlier"
          ? "Pick a medicine, then set the date, time and dose it was given."
          : "Records what was given and when — not dosing advice. Follow your pediatrician's instructions."}
      </p>
      {backdating ? (
        <EventEditor
          kind="med"
          defaults={{
            subtype: backdating,
            amount: backdating === "vitamin_d" ? 400 : null,
            unit: defaultMedUnit(backdating) || null,
          }}
          onClose={() => {
            setBackdating(null);
            onDone?.();
          }}
        />
      ) : null}
    </div>
  );
}

export function PumpPicker({ onDone }: { onDone?: () => void }) {
  const { logPumping } = useQuickLog();
  const [oz, setOz] = useState(3);
  const [side, setSide] = useState<"left" | "right" | "both">("both");
  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Side"
        value={side}
        onChange={setSide}
        options={[
          { value: "left", label: "Left" },
          { value: "both", label: "Both" },
          { value: "right", label: "Right" },
        ]}
      />
      <Stepper label="amount" value={oz} onChange={setOz} step={0.5} min={0.5} max={16} format={(v) => `${v} oz`} />
      <Button
        variant="squish"
        size="xl"
        className="w-full"
        onClick={(e) => {
          void logPumping(oz, "oz", side, e.currentTarget);
          onDone?.();
        }}
      >
        Log {oz} oz pumped
      </Button>
    </div>
  );
}

const TUMMY_MINUTES = [3, 5, 10, 15] as const;

export function TummyPicker({ onDone }: { onDone?: () => void }) {
  const { logTummyTime } = useQuickLog();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {TUMMY_MINUTES.map((m) => (
          <Pressable
            key={m}
            onClick={(e) => {
              void logTummyTime(m, e.currentTarget);
              onDone?.();
            }}
            className="flex aspect-square flex-col items-center justify-center rounded-2xl bg-kind-tummy-soft shadow-squish"
          >
            <span className="font-display text-2xl font-semibold text-kind-tummy-strong">{m}</span>
            <span className="text-xs font-semibold text-muted-foreground">min</span>
          </Pressable>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Supervised tummy time builds neck &amp; shoulder strength — a few minutes, several times a day.
      </p>
    </div>
  );
}
