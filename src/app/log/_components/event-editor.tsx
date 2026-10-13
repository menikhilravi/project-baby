"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
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
import { defaultMedUnit, MED_UNITS } from "@/lib/med-schedule";
import { createEventAt, removeEvent, updateEvent } from "../actions";
import type { BabyEventRow } from "./timeline";

const PUMP_SIDES = ["left", "right", "both"] as const;

/** Seed values for a fresh entry — e.g. "Vitamin D, 400 IU, last Tuesday". */
export type EventDefaults = {
  occurred_at?: string;
  subtype?: string | null;
  amount?: number | null;
  unit?: string | null;
};

type Props = {
  kind: EventKind;
  /** Present → edit mode; absent → create mode. */
  row?: BabyEventRow | null;
  /** Create mode only: pre-fill the form (back-dating, known dose). */
  defaults?: EventDefaults;
  /** Called when the dialog should close (backdrop, cancel, or save). */
  onClose: () => void;
  onSaved?: (row: BabyEventRow) => void;
  /** Provide to offer Delete inside the editor (edit mode only). */
  onDeleted?: (id: number) => void;
};

/**
 * Mounted only while open (parent conditionally renders it), so the form seeds
 * cleanly from `row` — or from `defaults` / "now" for a fresh entry — via
 * useState initializers, no reset effect required.
 */
export function EventEditor({
  kind,
  row,
  defaults,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const meta = KIND_META[kind];
  const isEdit = Boolean(row);
  const durationKind = kind === "sleep" || kind === "tummy";

  const [when, setWhen] = useState(() =>
    toLocalInput(
      row?.occurred_at ?? defaults?.occurred_at ?? new Date().toISOString(),
    ),
  );
  const [ended, setEnded] = useState(() =>
    toLocalInput(
      row?.ended_at ?? (durationKind ? new Date().toISOString() : null),
    ),
  );
  const [subtype, setSubtype] = useState<string | null>(
    () => row?.subtype ?? defaults?.subtype ?? defaultSubtype(kind),
  );
  const [amount, setAmount] = useState(() => {
    const seed = row?.amount ?? defaults?.amount;
    return seed != null ? String(seed) : "";
  });
  const [unit, setUnit] = useState(
    () => row?.unit ?? defaults?.unit ?? defaultUnit(kind, subtype),
  );
  const [notes, setNotes] = useState(() => row?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
        if (saved) onSaved?.(saved as BabyEventRow);
        onClose();
      } catch (e) {
        setError(friendlyError(e, kind));
      }
    });
  };

  const destroy = () => {
    if (!row) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeEvent(row.id);
        onDeleted?.(row.id);
        onClose();
      } catch (e) {
        setError(friendlyError(e, kind));
      }
    });
  };

  /**
   * Picking a different medicine swaps in that med's usual unit — but only
   * while the dose field is untouched, so it never overwrites a typed dose.
   */
  const pickSubtype = (value: string | null) => {
    setSubtype(value);
    if (kind === "med" && amount.trim() === "") setUnit(defaultMedUnit(value));
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={`${isEdit ? "Edit" : "Add"} ${meta.label.toLowerCase()}`}
      description={isEdit ? undefined : "Back-date it if you missed it — any past time works."}
    >
        <div className="space-y-4">
          <Field label={showEnded ? "Started" : "When"}>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
             
            />
          </Field>

          {showEnded ? (
            <Field label="Ended">
              <Input
                type="datetime-local"
                value={ended}
                onChange={(e) => setEnded(e.target.value)}
               
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
              onChange={pickSubtype}
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
                  className="max-w-28"
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
               
              />
            </Field>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="flex items-center gap-2 pt-5 pb-2">
          {isEdit && onDeleted ? (
            <Button
              variant="ghost"
              onClick={() => (confirmDelete ? destroy() : setConfirmDelete(true))}
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {confirmDelete ? "Tap to confirm" : "Delete"}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={pending}
            className="ml-auto"
          >
            Cancel
          </Button>
          <Button variant="squish" size="lg" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save" : "Add"}
          </Button>
        </div>
    </Sheet>
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
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                "h-10 rounded-full border px-4 text-sm font-semibold capitalize transition-all active:scale-[0.97]",
                active
                  ? "border-transparent bg-accent-baby-soft text-accent-baby-strong ring-2 ring-accent-baby/40"
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
        ? [...MED_UNITS]
        : ["oz", "ml"];
  return (
    <div className="flex gap-1">
      {units.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={cn(
            "h-10 rounded-xl border px-3 text-xs font-bold uppercase transition-all",
            value === u
              ? "border-transparent bg-accent-baby-soft text-accent-baby-strong ring-2 ring-accent-baby/40"
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

function defaultUnit(kind: EventKind, subtype: string | null): string {
  if (kind === "temp") return "f";
  if (kind === "pump" || kind === "feed") return "oz";
  if (kind === "med") return defaultMedUnit(subtype);
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
