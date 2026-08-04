"use client";

import { useState, useTransition } from "react";
import { Pill, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MED_LABELS, MED_SUBTYPES } from "@/lib/baby-events";
import {
  defaultMedUnit,
  formatSlot,
  MED_UNITS,
  normalizeTimes,
  parseHhMm,
  scheduleMinutes,
  scheduleName,
  type MedScheduleRow,
} from "@/lib/med-schedule";
import { deleteMedSchedule, saveMedSchedule } from "../actions";

/**
 * Per-medicine dosing schedules — "Vitamin D at 9:00", "gas drops at 14:00 and
 * 20:00". The cron that sends feed/diaper nudges reads these too, so the push
 * subscription managed by <CareReminders> is what actually delivers them; this
 * card only owns the what-and-when.
 */
export function MedReminders({
  initialSchedules,
}: {
  initialSchedules: MedScheduleRow[];
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [editing, setEditing] = useState<MedScheduleRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upsert = (row: MedScheduleRow) =>
    setSchedules((prev) => {
      const next = prev.some((s) => s.id === row.id)
        ? prev.map((s) => (s.id === row.id ? row : s))
        : [...prev, row];
      return next.sort((a, b) => a.id - b.id);
    });

  const remove = (id: number) => {
    setError(null);
    const snapshot = schedules;
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    startTransition(async () => {
      try {
        await deleteMedSchedule(id);
      } catch (e) {
        setSchedules(snapshot);
        setError(e instanceof Error ? e.message : "Couldn't delete that.");
      }
    });
  };

  const toggleActive = (row: MedScheduleRow) => {
    setError(null);
    const next = { ...row, active: !row.active };
    upsert(next);
    startTransition(async () => {
      try {
        await saveMedSchedule({ ...next });
      } catch (e) {
        upsert(row);
        setError(e instanceof Error ? e.message : "Couldn't save that.");
      }
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500">
          <Pill className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-tight">
            Medicine reminders
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A nudge at each dose time — skipped automatically once that dose is
            logged. Unlike feed nudges these ignore quiet hours, since you
            picked the time.
          </p>
        </div>
      </div>

      {schedules.length > 0 ? (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium leading-tight",
                    !s.active && "text-muted-foreground line-through",
                  )}
                >
                  {scheduleName(s)}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {scheduleMinutes(s.times).map(formatSlot).join(" · ") ||
                    "No times set"}
                  {s.amount != null
                    ? ` · ${s.amount}${s.unit ?? ""}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={s.active}
                aria-label={`${scheduleName(s)} reminders`}
                onClick={() => toggleActive(s)}
                disabled={pending}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                  s.active ? "bg-logger" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    s.active ? "translate-x-[22px]" : "translate-x-0.5",
                  )}
                />
              </button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(s)}
                className="h-8 px-2 text-xs"
              >
                Edit
              </Button>
              <button
                type="button"
                onClick={() => remove(s.id)}
                disabled={pending}
                aria-label={`Delete ${scheduleName(s)} schedule`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {editing ? (
        <ScheduleForm
          key={editing === "new" ? "new" : editing.id}
          schedule={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            upsert(row);
            setEditing(null);
          }}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setEditing("new");
          }}
          className="rounded-full"
        >
          <Plus className="h-4 w-4" /> Add a medicine
        </Button>
      )}
    </div>
  );
}

function ScheduleForm({
  schedule,
  onCancel,
  onSaved,
}: {
  schedule: MedScheduleRow | null;
  onCancel: () => void;
  onSaved: (row: MedScheduleRow) => void;
}) {
  const [subtype, setSubtype] = useState(schedule?.subtype ?? "vitamin_d");
  const [label, setLabel] = useState(schedule?.label ?? "");
  const [times, setTimes] = useState<string[]>(
    () => normalizeTimes(schedule?.times) || [],
  );
  const [draftTime, setDraftTime] = useState("");
  const [amount, setAmount] = useState(
    schedule?.amount != null ? String(schedule.amount) : "",
  );
  const [unit, setUnit] = useState(
    schedule?.unit ?? defaultMedUnit(schedule?.subtype ?? "vitamin_d"),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pickSubtype = (value: string) => {
    setSubtype(value);
    if (amount.trim() === "") setUnit(defaultMedUnit(value));
  };

  const addTime = () => {
    if (parseHhMm(draftTime) === null) {
      setError("Pick a valid time.");
      return;
    }
    setError(null);
    setTimes((prev) => normalizeTimes([...prev, draftTime]));
    setDraftTime("");
  };

  const submit = () => {
    setError(null);
    if (times.length === 0) {
      setError("Add at least one time.");
      return;
    }
    const amountNum = amount.trim() === "" ? null : Number(amount);
    if (amountNum != null && !Number.isFinite(amountNum)) {
      setError("Enter a valid dose.");
      return;
    }
    startTransition(async () => {
      try {
        const saved = await saveMedSchedule({
          id: schedule?.id,
          subtype,
          label: subtype === "other" ? label : null,
          times,
          amount: amountNum,
          unit,
          active: schedule?.active ?? true,
        });
        onSaved(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save that.");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Medicine
        </Label>
        <div className="flex flex-wrap gap-2">
          {MED_SUBTYPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pickSubtype(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.97]",
                subtype === s
                  ? "bg-logger-soft border-logger text-logger ring-1 ring-logger/30"
                  : "bg-card border-border text-foreground hover:bg-muted",
              )}
            >
              {MED_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {subtype === "other" ? (
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Name
          </Label>
          <Input
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Iron drops"
            className="rounded-xl"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Times
        </Label>
        {times.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {times.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1 text-xs font-medium tabular-nums"
              >
                {formatSlot(parseHhMm(t) ?? 0)}
                <button
                  type="button"
                  onClick={() => setTimes((prev) => prev.filter((x) => x !== t))}
                  aria-label={`Remove ${t}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            className="h-8 w-32 rounded-lg"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addTime}
            disabled={!draftTime}
            className="h-8 rounded-lg text-xs"
          >
            Add time
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Dose (optional)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="400"
            className="h-8 max-w-24 rounded-lg"
          />
          <div className="flex gap-1">
            {MED_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium uppercase transition-all",
                  unit === u
                    ? "bg-logger-soft border-logger text-logger"
                    : "bg-card border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={pending}
          className="rounded-lg"
        >
          {pending ? "Saving…" : schedule ? "Save" : "Add"}
        </Button>
      </div>
    </div>
  );
}
