"use client";

import { useState, useTransition } from "react";
import { Milk, Minus, Pill, Plus, Thermometer, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { MED_SUBTYPES, MED_LABELS, type MedSubtype } from "@/lib/baby-events";
import { classifyTemp, feverAlert } from "@/lib/newborn-health";
import { logMed, logPump, logTemp, logTummy } from "../actions";

const TUMMY_MINUTES = [3, 5, 10, 15] as const;
const PUMP_SIDES = ["left", "right", "both"] as const;

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
  const [expanded, setExpanded] = useState<
    "temp" | "med" | "pump" | "tummy" | null
  >(null);
  const [pending, startTransition] = useTransition();
  const toggle = (k: "temp" | "med" | "pump" | "tummy") =>
    setExpanded((c) => (c === k ? null : k));
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
        setExpanded(null);
      } catch (err) {
        console.error(err);
      }
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HealthButton
          label="Temp"
          icon={Thermometer}
          accent="text-rose-500"
          active={expanded === "temp"}
          onClick={() => toggle("temp")}
          disabled={pending}
        />
        <HealthButton
          label="Medicine"
          icon={Pill}
          accent="text-violet-500"
          active={expanded === "med"}
          onClick={() => toggle("med")}
          disabled={pending}
        />
        <HealthButton
          label="Pump"
          icon={Milk}
          accent="text-sky-500"
          active={expanded === "pump"}
          onClick={() => toggle("pump")}
          disabled={pending}
        />
        <HealthButton
          label="Tummy"
          icon={Timer}
          accent="text-emerald-500"
          active={expanded === "tummy"}
          onClick={() => toggle("tummy")}
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
          onLog={(subtype) =>
            run(() =>
              logMed(
                subtype === "vitamin_d"
                  ? { subtype, amount: 400, unit: "iu" }
                  : { subtype },
              ),
            )
          }
        />
      ) : null}

      {expanded === "pump" ? (
        <PumpPicker
          disabled={pending}
          onLog={(amount, unit, side) => run(() => logPump(amount, unit, side))}
        />
      ) : null}

      {expanded === "tummy" ? (
        <TummyPicker
          disabled={pending}
          onLog={(min) => run(() => logTummy(min))}
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

function PumpPicker({
  onLog,
  disabled,
}: {
  onLog: (amount: number, unit: "oz" | "ml", side: "left" | "right" | "both") => void;
  disabled?: boolean;
}) {
  const [oz, setOz] = useState(3);
  const [side, setSide] = useState<"left" | "right" | "both">("both");
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOz((v) => Math.max(0.5, +(v - 0.5).toFixed(1)))}
          disabled={disabled}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-50"
          aria-label="Less"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-16 text-center text-lg font-bold tabular-nums">
          {oz} oz
        </span>
        <button
          type="button"
          onClick={() => setOz((v) => +(v + 0.5).toFixed(1))}
          disabled={disabled}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-muted disabled:opacity-50"
          aria-label="More"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="ml-auto flex rounded-full border border-border p-0.5">
          {PUMP_SIDES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                side === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onLog(oz, "oz", side)}
        disabled={disabled}
        className="w-full rounded-full bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
      >
        Log pump
      </button>
    </div>
  );
}

function TummyPicker({
  onLog,
  disabled,
}: {
  onLog: (minutes: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {TUMMY_MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onLog(m)}
            disabled={disabled}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium transition-all hover:bg-muted active:scale-[0.97] disabled:opacity-50"
          >
            {m} min
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Supervised tummy time builds neck &amp; shoulder strength — a few
        minutes several times a day.
      </p>
    </div>
  );
}
