"use client";

import { useState, useTransition } from "react";
import { Minus, Pill, Plus, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { MED_SUBTYPES, MED_LABELS, type MedSubtype } from "@/lib/baby-events";
import { classifyTemp, feverAlert } from "@/lib/newborn-health";
import { logMed, logTemp } from "../actions";

/**
 * Compact temperature + medicine logging, sharing the visual language of the
 * feed/diaper/sleep QuickLogPanel. Rendered right beneath it on /log and
 * /today. Temperature entry shows an immediate, honest fever note (the
 * authoritative alert still lives on /today's FeverAlertCard).
 */
export function HealthQuickLog({
  birthDate,
}: {
  birthDate: string | null;
}) {
  const [expanded, setExpanded] = useState<"temp" | "med" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <HealthButton
          label="Temp"
          icon={Thermometer}
          accent="text-rose-500"
          active={expanded === "temp"}
          onClick={() => setExpanded((c) => (c === "temp" ? null : "temp"))}
          disabled={pending}
        />
        <HealthButton
          label="Medicine"
          icon={Pill}
          accent="text-violet-500"
          active={expanded === "med"}
          onClick={() => setExpanded((c) => (c === "med" ? null : "med"))}
          disabled={pending}
        />
      </div>

      {expanded === "temp" ? (
        <TempPicker
          birthDate={birthDate}
          disabled={pending}
          onLog={(amount, unit) => {
            startTransition(async () => {
              try {
                await logTemp(amount, unit);
                setExpanded(null);
              } catch (err) {
                console.error(err);
              }
            });
          }}
        />
      ) : null}

      {expanded === "med" ? (
        <MedPicker
          disabled={pending}
          onLog={(subtype) => {
            startTransition(async () => {
              try {
                await logMed(
                  subtype === "vitamin_d"
                    ? { subtype, amount: 400, unit: "iu" }
                    : { subtype },
                );
                setExpanded(null);
              } catch (err) {
                console.error(err);
              }
            });
          }}
        />
      ) : null}
    </div>
  );
}

function HealthButton({
  label,
  icon: Icon,
  accent,
  active,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Thermometer;
  accent: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group rounded-2xl border border-border bg-card px-3 py-3.5 flex items-center justify-center gap-2.5 transition-all duration-200",
        "hover:border-foreground/20 active:scale-[0.98] disabled:opacity-60",
        active && "bg-muted border-foreground/20",
      )}
    >
      <span
        className={cn(
          "grid place-items-center h-9 w-9 rounded-2xl bg-muted",
          accent,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">{label}</span>
    </button>
  );
}

function TempPicker({
  birthDate,
  onLog,
  disabled,
}: {
  birthDate: string | null;
  onLog: (amount: number, unit: "f" | "c") => void;
  disabled?: boolean;
}) {
  const [unit, setUnit] = useState<"f" | "c">("f");
  const [value, setValue] = useState(98.6);

  const adjust = (dir: 1 | -1) =>
    setValue((v) => +(v + dir * 0.1).toFixed(1));

  const setUnitReset = (u: "f" | "c") => {
    setUnit(u);
    setValue(u === "f" ? 98.6 : 37.0);
  };

  const status = classifyTemp({ amount: value, unit });
  const alert =
    status === "fever" || status === "low"
      ? feverAlert({ amount: value, unit }, birthDate, new Date())
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={disabled}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-50"
            aria-label="Lower"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-20 text-center text-lg font-bold tabular-nums">
            {value.toFixed(1)}°{unit.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={disabled}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-50"
            aria-label="Raise"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="ml-auto flex rounded-full border border-border p-0.5">
          {(["f", "c"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnitReset(u)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                unit === u
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              °{u.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {alert ? (
        <p
          className={cn(
            "text-xs font-medium",
            alert.urgent ? "text-destructive" : "text-amber-600",
          )}
        >
          {alert.status === "low"
            ? "That's low for a baby — call your pediatrician."
            : alert.urgent
              ? "Fever. Under 3 months this is urgent — call your pediatrician now."
              : "This is a fever — keep an eye on it and call if it climbs."}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onLog(value, unit)}
        disabled={disabled}
        className="w-full rounded-full bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
      >
        Log temperature
      </button>
    </div>
  );
}

function MedPicker({
  onLog,
  disabled,
}: {
  onLog: (subtype: MedSubtype) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {MED_SUBTYPES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onLog(s)}
            disabled={disabled}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              "hover:bg-muted active:scale-[0.97] disabled:opacity-50",
              s === "vitamin_d"
                ? "border-violet-400/50 bg-violet-500/10 text-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {MED_LABELS[s]}
            {s === "vitamin_d" ? (
              <span className="ml-1 text-xs text-muted-foreground">400 IU</span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Records what was given and when — not dosing advice. Follow your
        pediatrician&apos;s instructions.
      </p>
    </div>
  );
}
