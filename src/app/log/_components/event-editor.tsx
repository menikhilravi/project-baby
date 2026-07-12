"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DIAPER_SUBTYPES,
  FEED_SUBTYPES,
  MED_LABELS,
  MED_SUBTYPES,
  subtypeLabel,
} from "@/lib/baby-events";
import { KIND_META, type EventKind } from "@/lib/kind-meta";
import { createEventAt, updateEvent } from "../actions";
import type { BabyEventRow } from "./timeline";

const PUMP_SIDES = ["left", "right", "both"] as const;

type Props = {
  kind: EventKind;
  /** Present → edit mode; absent → create mode. */
  row?: BabyEventRow | null;
  /** Called when the dialog should close (backdrop, cancel, or save). */
  onClose: () => void;
  onSaved: (row: BabyEventRow) => void;
};

/**
 * Mounted only while open (parent conditionally renders it), so the form seeds
 * cleanly from `row` — or from "now" for a fresh entry — via useState
 * initializers, no reset effect required.
 */
export function EventEditor({ kind, row, onClose, onSaved }: Props) {
  const meta = KIND_META[kind];
  const isEdit = Boolean(row);
  const durationKind = kind === "sleep" || kind === "tummy";

  const [when, setWhen] = useState(() =>
    toLocalInput(row?.occurred_at ?? new Date().toISOString()),
  );
  const [ended, setEnded] = useState(() =>
    toLocalInput(
      row?.ended_at ?? (durationKind ? new Date().toISOString() : null),
    ),
  );
  const [subtype, setSubtype] = useState<string | null>(
    () => row?.subtype ?? defaultSubtype(kind),
  );
  const [amount, setAmount] = useState(() =>
    row?.amount != null ? String(row.amount) : "",
  );
  const [unit, setUnit] = useState(() => row?.unit ?? defaultUnit(kind));
  const [notes, setNotes] = useState(() => row?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nursing = kind === "feed" && (subtype === "left" || subtype === "right");
  const showEnded = durationKind || nursing;
  const showAmount =
    kind === "temp" ||
    kind === "pump" ||
    kind === "med" ||
    (kind === "feed" && subtype === "bottle");

  const submit = () => {
    setError(null);
    if (!when) {
      setError("Pick a date and time.");
      return;
    }
    const occurredIso = fromLocalInput(when);
    const amountNum = amount.trim() === "" ? null : Number(amount);
    if (amountNum != null && !Number.isFinite(amountNum)) {
      setError("Enter a valid number.");
      return;
    }
    if (kind === "temp" && amountNum == null) {
      setError("Enter a temperature.");
      return;
    }
    if (kind === "milestone" && !notes.trim()) {
      setError("Add a short description.");
      return;
    }

    let endedIso: string | null;
    if (showEnded) {
      endedIso = ended ? fromLocalInput(ended) : kind === "sleep" ? null : occurredIso;
    } else {
      endedIso = occurredIso; // instant events end when they start
    }
    if (endedIso && new Date(endedIso).getTime() < new Date(occurredIso).getTime()) {
      setError("End time can’t be before the start time.");
      return;
    }

    const detail = {
      subtype: subtype ?? null,
      amount: amountNum,
      unit: showAmount && amountNum != null ? unit || null : null,
      notes: kind === "milestone" ? notes.trim() : notes.trim() || null,
    };

    startTransition(async () => {
      try {
        const saved = isEdit
          ? await updateEvent(row!.id, {
              occurred_at: occurredIso,
              ended_at: endedIso,
              ...detail,
            })
          : await createEventAt({
              kind,
              occurred_at: occurredIso,
              ended_at: endedIso,
              ...detail,
            });
        if (saved) onSaved(saved as BabyEventRow);
        onClose();
      } catch (e) {
        setError(friendlyError(e, kind));
      }
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Edit" : "Add"} {meta.label.toLowerCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label={showEnded ? "Started" : "When"}>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-xl"
            />
          </Field>

          {showEnded ? (
            <Field label="Ended">
              <Input
                type="datetime-local"
                value={ended}
                onChange={(e) => setEnded(e.target.value)}
                className="rounded-xl"
              />
              {kind === "sleep" ? (
                <p className="text-[11px] text-muted-foreground">
                  Leave blank if the baby is still sleeping.
                </p>
              ) : null}
            </Field>
          ) : null}

          {kind === "diaper" ? (
            <ChipField
              label="Type"
              value={subtype}
              options={DIAPER_SUBTYPES.map((s) => ({
                value: s,
                label: subtypeLabel(s) ?? s,
              }))}
              onChange={setSubtype}
              allowNone
            />
          ) : null}

          {kind === "feed" ? (
            <ChipField
              label="Type"
              value={subtype}
              options={FEED_SUBTYPES.map((s) => ({ value: s, label: s }))}
              onChange={setSubtype}
              allowNone
            />
          ) : null}

          {kind === "med" ? (
            <ChipField
              label="Medicine"
              value={subtype}
              options={MED_SUBTYPES.map((s) => ({
                value: s,
                label: MED_LABELS[s],
              }))}
              onChange={setSubtype}
            />
          ) : null}

          {kind === "pump" ? (
            <ChipField
              label="Side"
              value={subtype}
              options={PUMP_SIDES.map((s) => ({ value: s, label: s }))}
              onChange={setSubtype}
            />
          ) : null}

          {showAmount ? (
            <Field label={kind === "temp" ? "Temperature" : "Amount"}>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={kind === "temp" ? "98.6" : "4"}
                  className="max-w-28 rounded-xl"
                />
                <UnitToggle kind={kind} value={unit} onChange={setUnit} />
              </div>
            </Field>
          ) : null}

          {kind === "milestone" ? (
            <Field label="Milestone">
              <Input
                value={notes}
                maxLength={80}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="First smile"
                className="rounded-xl"
              />
            </Field>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="rounded-xl">
            {pending ? "Saving…" : isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChipField({
  label,
  value,
  options,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
  allowNone?: boolean;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(allowNone && active ? null : o.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-all active:scale-[0.97]",
                active
                  ? "bg-logger-soft border-logger text-logger ring-1 ring-logger/30"
                  : "bg-card border-border text-foreground hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function UnitToggle({
  kind,
  value,
  onChange,
}: {
  kind: EventKind;
  value: string;
  onChange: (v: string) => void;
}) {
  const units =
    kind === "temp"
      ? ["f", "c"]
      : kind === "med"
        ? ["iu", "mg"]
        : ["oz", "ml"];
  return (
    <div className="flex gap-1">
      {units.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium uppercase transition-all",
            value === u
              ? "bg-logger-soft border-logger text-logger"
              : "bg-card border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {kind === "temp" ? `°${u.toUpperCase()}` : u}
        </button>
      ))}
    </div>
  );
}

/** Turn raw Postgres/RLS errors into something a sleep-deprived parent can act on. */
function friendlyError(e: unknown, kind: EventKind): string {
  const msg = e instanceof Error ? e.message.toLowerCase() : "";
  // Open-sleep / open-nursing unique indexes (migration 0025).
  if (msg.includes("duplicate") || msg.includes("unique")) {
    return kind === "sleep"
      ? "A sleep is already in progress — set an end time first."
      : "That overlaps an in-progress session. Close it first.";
  }
  // .single() finds no row when RLS hides it or it was already deleted.
  if (msg.includes("no rows") || msg.includes("multiple (or no)")) {
    return "Couldn’t find that entry — it may have been deleted.";
  }
  return "Something went wrong. Please try again.";
}

function defaultSubtype(kind: EventKind): string | null {
  if (kind === "med") return "other";
  if (kind === "pump") return "both";
  return null;
}

function defaultUnit(kind: EventKind): string {
  if (kind === "temp") return "f";
  if (kind === "pump" || kind === "feed") return "oz";
  return "";
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}
