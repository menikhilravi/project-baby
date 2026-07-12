"use client";

import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { medLabel, subtypeLabel } from "@/lib/baby-events";
import { KIND_META, type EventKind } from "@/lib/kind-meta";

export type BabyEventRow = {
  id: number;
  user_id: string;
  couple_id: string | null;
  kind: EventKind;
  subtype: string | null;
  amount: number | null;
  unit: string | null;
  occurred_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type RoleMap = Record<string, "mom" | "dad" | null>;

export function Timeline({
  events,
  currentUserId,
  roleMap,
  onEdit,
  onRemove,
  emptyLabel = "No events yet — tap a button above to log the first one.",
}: {
  events: BabyEventRow[];
  currentUserId: string;
  roleMap: RoleMap;
  onEdit: (row: BabyEventRow) => void;
  onRemove: (id: number) => void;
  emptyLabel?: string;
}) {
  const grouped = useMemo(() => groupByDay(events), [events]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([day, rows]) => (
        <section key={day}>
          <h3 className="px-1 mb-2 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            {day}
          </h3>
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <TimelineRow
                key={row.id}
                row={row}
                isMine={row.user_id === currentUserId}
                role={roleMap[row.user_id] ?? null}
                onEdit={() => onEdit(row)}
                onRemove={() => onRemove(row.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TimelineRow({
  row,
  isMine,
  role,
  onEdit,
  onRemove,
}: {
  row: BabyEventRow;
  isMine: boolean;
  role: "mom" | "dad" | null;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const meta = KIND_META[row.kind];
  const Icon = meta?.icon;
  const who = isMine ? "You" : role ? capitalize(role) : "Partner";
  const time = formatTime(row.occurred_at);

  let detail: string | null = null;
  if (row.kind === "sleep") {
    detail = row.ended_at
      ? durationLabel(row.occurred_at, row.ended_at)
      : "ongoing";
  } else if (row.kind === "temp") {
    detail =
      row.amount != null
        ? `${row.amount}°${(row.unit ?? "f").toUpperCase()}`
        : null;
  } else if (row.kind === "med") {
    const dose = row.amount != null ? ` ${row.amount}${row.unit ?? ""}` : "";
    detail = `${medLabel(row.subtype)}${dose}`;
  } else if (row.kind === "pump") {
    const amt = row.amount != null ? ` · ${row.amount}${row.unit ?? ""}` : "";
    detail = `${row.subtype ?? "both"}${amt}`;
  } else if (row.kind === "tummy") {
    detail = row.ended_at ? durationLabel(row.occurred_at, row.ended_at) : null;
  } else if (
    row.kind === "feed" &&
    (row.subtype === "left" || row.subtype === "right")
  ) {
    // Nursing session: show the side + duration (instant taps have no gap).
    if (row.ended_at === null) {
      detail = `${row.subtype} · nursing`;
    } else {
      const min =
        (new Date(row.ended_at).getTime() -
          new Date(row.occurred_at).getTime()) /
        60_000;
      detail =
        min >= 1
          ? `${row.subtype} · ${durationLabel(row.occurred_at, row.ended_at)}`
          : row.subtype;
    }
  } else {
    detail = subtypeLabel(row.subtype, row.amount, row.unit);
  }

  // Unknown kinds (e.g. stray contraction rows) are skipped rather than crashing.
  if (!meta || !Icon) return null;

  // For a med row the subtype IS the label; a milestone's label lives in notes.
  const title =
    row.kind === "med"
      ? medLabel(row.subtype)
      : row.kind === "milestone"
        ? (row.notes ?? "Milestone")
        : meta.label;
  const showDetail = row.kind === "med" ? row.amount != null : Boolean(detail);
  const detailText =
    row.kind === "med" && row.amount != null
      ? `${row.amount}${row.unit ?? ""}`
      : detail;

  return (
    <li className="group flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
        aria-label="Edit event"
      >
        <span
          className={cn(
            "grid place-items-center h-9 w-9 rounded-xl bg-muted ring-1 ring-border shrink-0",
            meta.accent,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-medium">{title}</span>
            {showDetail && detailText ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {detailText}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {time} · {who}
          </p>
        </div>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-destructive"
        aria-label="Delete event"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function groupByDay(events: BabyEventRow[]): Array<[string, BabyEventRow[]]> {
  const map = new Map<string, BabyEventRow[]>();
  for (const e of events) {
    const key = dayLabel(e.occurred_at);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function durationLabel(startIso: string, endIso: string): string {
  const dur = Math.max(
    0,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000,
    ),
  );
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
