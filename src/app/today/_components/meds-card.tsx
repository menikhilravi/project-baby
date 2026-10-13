"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, Clock, Pencil, Pill, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { medLabel } from "@/lib/baby-events";
import {
  defaultMedUnit,
  formatSlot,
  matchDoses,
  scheduleMinutes,
  scheduleName,
  type MedScheduleRow,
} from "@/lib/med-schedule";
import { logMed } from "@/app/log/actions";
import { EventEditor } from "@/app/log/_components/event-editor";
import type { BabyEventRow } from "@/app/log/_components/timeline";

export type MedRow = BabyEventRow;

/** Days of Vitamin D history in the catch-up strip. */
const STRIP_DAYS = 7;
/** Fallback time for a back-dated Vitamin D dose when no schedule says otherwise. */
const DEFAULT_VITAMIN_D_MIN = 9 * 60;

type Editing =
  | { mode: "edit"; row: BabyEventRow }
  | { mode: "create"; occurredAt: string; subtype: string; amount: number | null }
  | null;

/**
 * Three jobs: a one-tap daily Vitamin D check (AAP: 400 IU/day for breastfed
 * babies from the first days), a catch-up strip for the last week so a missed
 * day can be filled in, and a "what was given, when" list for the last 24h so
 * partners don't double-dose. Every row opens the editor — retime, redose, or
 * delete. Local-day filtering happens on mount, in the viewer's timezone.
 */
export function MedsCard({
  rows,
  schedules,
}: {
  rows: MedRow[];
  schedules: MedScheduleRow[];
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);
  if (!now) return null;

  const startOfDay = startOfLocalDay(now);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const vitaminDToday = rows.find(
    (r) => r.subtype === "vitamin_d" && new Date(r.occurred_at) >= startOfDay,
  );
  const recent = rows
    .filter((r) => new Date(r.occurred_at) >= dayAgo)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 4);

  const vitaminDSchedule = schedules.find((s) => s.subtype === "vitamin_d");
  const vitaminDSlot = scheduleMinutes(vitaminDSchedule?.times)[0] ?? null;
  // Vitamin D has its own row above; the rest share a "today's schedule" list.
  const otherSchedules = schedules.filter((s) => s.subtype !== "vitamin_d");

  const giveVitaminD = () =>
    startTransition(async () => {
      try {
        await logMed({
          subtype: "vitamin_d",
          amount: vitaminDSchedule?.amount ?? 400,
          unit: (vitaminDSchedule?.unit as "iu" | "mg") ?? "iu",
        });
      } catch (err) {
        console.error(err);
      }
    });

  const addAt = (date: Date, subtype: string, amount: number | null) =>
    setEditing({
      mode: "create",
      occurredAt: date.toISOString(),
      subtype,
      amount,
    });

  return (
    <div className="rounded-card border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Pill className="h-4 w-4 text-kind-med" />
        <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex-1">
          Medicine
        </p>
        <Link
          href="/log/med"
          className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid place-items-center h-9 w-9 rounded-xl",
            vitaminDToday
              ? "bg-kind-tummy-soft text-kind-tummy-strong"
              : "bg-kind-med-soft text-kind-med",
          )}
        >
          {vitaminDToday ? (
            <Check className="h-4.5 w-4.5" />
          ) : (
            <Pill className="h-4.5 w-4.5" />
          )}
        </span>
        {vitaminDToday ? (
          <button
            type="button"
            onClick={() => setEditing({ mode: "edit", row: vitaminDToday })}
            className="group flex flex-1 min-w-0 items-center gap-2 text-left"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Vitamin D</span>
              <span className="block text-xs text-muted-foreground tabular-nums">
                Given {fmtTime(vitaminDToday.occurred_at)} · tap to change
              </span>
            </span>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
          </button>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Vitamin D</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {vitaminDSlot != null
                  ? `Due ${formatSlot(vitaminDSlot)}`
                  : "Not yet today"}{" "}
                · {vitaminDSchedule?.amount ?? 400}{" "}
                {(vitaminDSchedule?.unit ?? "iu").toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                addAt(
                  atMinuteOfDay(now, vitaminDSlot ?? DEFAULT_VITAMIN_D_MIN, now),
                  "vitamin_d",
                  vitaminDSchedule?.amount ?? 400,
                )
              }
              disabled={pending}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Log Vitamin D at another time"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={giveVitaminD}
              disabled={pending}
              className="rounded-full bg-kind-med px-4 py-2 text-xs font-bold text-on-accent shadow-squish active:translate-y-px active:scale-[0.97] disabled:opacity-50"
            >
              Log it
            </button>
          </>
        )}
      </div>

      <VitaminDStrip
        rows={rows}
        now={now}
        onPick={(day, existing) =>
          existing
            ? setEditing({ mode: "edit", row: existing })
            : addAt(
                atMinuteOfDay(day, vitaminDSlot ?? DEFAULT_VITAMIN_D_MIN),
                "vitamin_d",
                vitaminDSchedule?.amount ?? 400,
              )
        }
      />

      {otherSchedules.length > 0 ? (
        <ul className="mt-3 border-t border-border pt-2.5 space-y-1.5">
          {otherSchedules.map((s) => (
            <ScheduleRow
              key={s.id}
              schedule={s}
              rows={rows}
              startOfDay={startOfDay}
              nowMin={nowMin}
              onLogSlot={(slotMin) =>
                addAt(atMinuteOfDay(now, slotMin, now), s.subtype, s.amount)
              }
            />
          ))}
        </ul>
      ) : null}

      {recent.length > 0 ? (
        <ul className="mt-3 border-t border-border pt-2 space-y-0.5">
          {recent.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setEditing({ mode: "edit", row: r })}
                className="group flex w-full items-center gap-2 rounded-lg py-1 text-left text-xs text-muted-foreground tabular-nums hover:bg-muted/60"
              >
                <span className="text-foreground/80">{medLabel(r.subtype)}</span>
                {r.amount != null ? (
                  <span>
                    {r.amount}
                    {r.unit ?? ""}
                  </span>
                ) : null}
                <span className="ml-auto">{fmtTime(r.occurred_at)}</span>
                <Pencil className="h-3 w-3 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => addAt(now, "gas_drops", null)}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add a dose — any medicine, any time
      </button>

      {editing ? (
        <EventEditor
          kind="med"
          row={editing.mode === "edit" ? editing.row : undefined}
          defaults={
            editing.mode === "create"
              ? {
                  occurred_at: editing.occurredAt,
                  subtype: editing.subtype,
                  amount: editing.amount,
                  unit: defaultMedUnit(editing.subtype) || null,
                }
              : undefined
          }
          onClose={() => setEditing(null)}
          onDeleted={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Last seven days at a glance, so a forgotten dose is visible and one tap
 * away from being filled in — the strip is the back-dating entry point.
 */
function VitaminDStrip({
  rows,
  now,
  onPick,
}: {
  rows: MedRow[];
  now: Date;
  onPick: (day: Date, existing: MedRow | undefined) => void;
}) {
  const today = startOfLocalDay(now);
  const days = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (STRIP_DAYS - 1 - i));
    return d;
  });

  return (
    <div className="mt-3 flex items-center gap-1">
      {days.map((day, i) => {
        const next = new Date(day);
        next.setDate(day.getDate() + 1);
        const dose = rows.find(
          (r) =>
            r.subtype === "vitamin_d" &&
            new Date(r.occurred_at) >= day &&
            new Date(r.occurred_at) < next,
        );
        const isToday = i === STRIP_DAYS - 1;
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onPick(day, dose)}
            title={`${day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}${dose ? ` · given ${fmtTime(dose.occurred_at)}` : " · not logged"}`}
            className="group flex flex-1 flex-col items-center gap-1 rounded-lg py-1 hover:bg-muted/60"
          >
            <span
              className={cn(
                "text-[9px] font-medium uppercase tracking-wide",
                isToday ? "text-foreground" : "text-muted-foreground/70",
              )}
            >
              {day.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-[9px] transition-colors",
                dose
                  ? "bg-kind-tummy-soft text-kind-tummy-strong"
                  : "border border-dashed border-border text-muted-foreground/50 group-hover:border-foreground/40 group-hover:text-foreground",
              )}
            >
              {dose ? <Check className="h-3 w-3" /> : <Plus className="h-2.5 w-2.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One scheduled medicine, with each of today's slots marked given or not. */
function ScheduleRow({
  schedule,
  rows,
  startOfDay,
  nowMin,
  onLogSlot,
}: {
  schedule: MedScheduleRow;
  rows: MedRow[];
  startOfDay: Date;
  nowMin: number;
  onLogSlot: (slotMin: number) => void;
}) {
  const slots = scheduleMinutes(schedule.times);
  if (slots.length === 0) return null;

  // Next local midnight rather than +24h, so DST days still bound correctly.
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1);
  const doseMins = rows
    .filter((r) => r.subtype === schedule.subtype)
    .map((r) => new Date(r.occurred_at))
    .filter((d) => d >= startOfDay && d < endOfDay)
    .map((d) => d.getHours() * 60 + d.getMinutes());
  const statuses = matchDoses(slots, doseMins);

  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate text-foreground/80">
        {scheduleName(schedule)}
      </span>
      <span className="flex flex-wrap justify-end gap-1">
        {statuses.map((s) => {
          const given = s.givenMin !== null;
          const overdue = !given && nowMin >= s.slotMin;
          return (
            <button
              key={s.slotMin}
              type="button"
              onClick={() => onLogSlot(s.slotMin)}
              disabled={given}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                given
                  ? "bg-kind-tummy-soft text-kind-tummy-strong"
                  : overdue
                    ? "bg-kind-temp-soft text-kind-temp-strong hover:bg-kind-temp-soft/70"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {given ? "✓ " : ""}
              {formatSlot(s.slotMin)}
            </button>
          );
        })}
      </span>
    </li>
  );
}

function startOfLocalDay(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Same calendar day as `day`, at `minutes` past local midnight — clamped to
 * `notAfter` so seeding "today's 9am slot" at 7am doesn't pre-fill the future.
 */
function atMinuteOfDay(day: Date, minutes: number, notAfter?: Date): Date {
  const d = startOfLocalDay(day);
  d.setMinutes(minutes);
  return notAfter && d > notAfter ? notAfter : d;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
