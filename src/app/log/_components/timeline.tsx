"use client";

import { useMemo, useRef } from "react";
import { AnimatePresence, m, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { medLabel, subtypeLabel } from "@/lib/baby-events";
import { KIND_META, type EventKind } from "@/lib/kind-meta";
import { APP_LOCALE, formatClockTime, ymdIn } from "@/lib/time-format";
import { useTimeZone } from "@/components/providers/time-zone";
import { EmptyState } from "@/components/mascot/empty-state";

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

const SWIPE_DELETE = -96;

export function Timeline({
  events,
  currentUserId,
  roleMap,
  onEdit,
  onRemove,
  emptyLabel = "Nothing logged yet.",
  emptyAction,
}: {
  events: BabyEventRow[];
  currentUserId: string;
  roleMap: RoleMap;
  onEdit: (row: BabyEventRow) => void;
  onRemove: (row: BabyEventRow) => void;
  emptyLabel?: string;
  emptyAction?: React.ReactNode;
}) {
  const { tz, ready } = useTimeZone();
  const grouped = useMemo(() => groupByDay(events, tz), [events, tz]);

  if (events.length === 0) {
    return <EmptyState title="Nothing here yet" body={emptyLabel} action={emptyAction} />;
  }

  return (
    <div className="space-y-5">
      <AnimatePresence initial={false}>
        {grouped.map(([day, rows]) => (
          <m.section
            key={day}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.gentle}
          >
            <h3 className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-1 mb-2 px-1 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur md:top-0">
              {ready ? day : " "}
            </h3>
            <ul className="overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border/60">
              <AnimatePresence initial={false}>
                {rows.map((row) => (
                  <TimelineRow
                    key={row.id}
                    row={row}
                    isMine={row.user_id === currentUserId}
                    role={roleMap[row.user_id] ?? null}
                    time={ready ? formatClockTime(row.occurred_at, tz) : ""}
                    onEdit={() => onEdit(row)}
                    onRemove={() => onRemove(row)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </m.section>
        ))}
      </AnimatePresence>
    </div>
  );
}

function TimelineRow({
  row,
  isMine,
  role,
  time,
  onEdit,
  onRemove,
}: {
  row: BabyEventRow;
  isMine: boolean;
  role: "mom" | "dad" | null;
  time: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const x = useMotionValue(0);
  const trashOpacity = useTransform(x, [-20, SWIPE_DELETE], [0, 1]);
  const trashScale = useTransform(x, [-20, SWIPE_DELETE], [0.6, 1.1]);
  const armed = useRef(false);

  const meta = KIND_META[row.kind];
  // Unknown kinds (e.g. stray contraction rows) are skipped rather than crashing.
  if (!meta) return null;
  const Icon = meta.icon;
  const who = isMine ? "You" : role ? capitalize(role) : "Partner";
  const detail = describe(row);
  const title =
    row.kind === "med"
      ? medLabel(row.subtype)
      : row.kind === "milestone"
        ? (row.notes ?? "Milestone")
        : meta.label;

  const onDrag = (_: unknown, info: PanInfo) => {
    const past = info.offset.x < SWIPE_DELETE;
    if (past !== armed.current) {
      armed.current = past;
      haptic(past ? "warning" : "tick");
    }
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < SWIPE_DELETE) onRemove();
    armed.current = false;
  };

  return (
    <m.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22 } }}
      transition={spring.gentle}
      className="relative border-b border-border/60 last:border-b-0"
    >
      {/* Revealed behind the row while swiping left. */}
      <m.div
        aria-hidden
        style={{ opacity: trashOpacity }}
        className="absolute inset-0 flex items-center justify-end bg-destructive/15 pr-6 text-destructive"
      >
        <m.span style={{ scale: trashScale }}>
          <Trash2 className="h-5 w-5" />
        </m.span>
      </m.div>

      <m.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0.05 }}
        dragSnapToOrigin
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        style={{ x, touchAction: "pan-y" }}
        className="group relative flex items-center gap-3 bg-card px-3.5 py-3"
      >
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong"
          aria-label={`Edit ${title} at ${time}`}
        >
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", meta.tone.bgSoft, meta.tone.strong)}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="truncate text-[15px] font-bold">{title}</span>
              {detail ? <span className="shrink-0 text-xs font-semibold text-muted-foreground nums">{detail}</span> : null}
            </span>
            <span className="block text-xs text-muted-foreground nums">
              {time} · {who}
            </span>
          </span>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive"
          aria-label={`Delete ${title} at ${time}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </m.div>
    </m.li>
  );
}

function describe(row: BabyEventRow): string | null {
  if (row.kind === "sleep") return row.ended_at ? durationLabel(row.occurred_at, row.ended_at) : "ongoing";
  if (row.kind === "temp") return row.amount != null ? `${row.amount}°${(row.unit ?? "f").toUpperCase()}` : null;
  if (row.kind === "med") return row.amount != null ? `${row.amount}${row.unit ?? ""}` : null;
  if (row.kind === "pump") {
    const amt = row.amount != null ? ` · ${row.amount}${row.unit ?? ""}` : "";
    return `${row.subtype ?? "both"}${amt}`;
  }
  if (row.kind === "tummy") return row.ended_at ? durationLabel(row.occurred_at, row.ended_at) : null;
  if (row.kind === "feed" && (row.subtype === "left" || row.subtype === "right")) {
    // Nursing session: side + duration (instant taps have no gap).
    if (row.ended_at === null) return `${row.subtype} · nursing`;
    const min = (new Date(row.ended_at).getTime() - new Date(row.occurred_at).getTime()) / 60_000;
    return min >= 1 ? `${row.subtype} · ${durationLabel(row.occurred_at, row.ended_at)}` : row.subtype;
  }
  return subtypeLabel(row.subtype, row.amount, row.unit);
}

function groupByDay(events: BabyEventRow[], tz: string | undefined): Array<[string, BabyEventRow[]]> {
  const now = new Date();
  const today = ymdIn(now, tz);
  const yesterday = ymdIn(new Date(now.getTime() - 86_400_000), tz);
  const map = new Map<string, BabyEventRow[]>();
  for (const e of events) {
    const d = new Date(e.occurred_at);
    const ymd = ymdIn(d, tz);
    const key =
      ymd === today
        ? "Today"
        : ymd === yesterday
          ? "Yesterday"
          : d.toLocaleDateString(APP_LOCALE, { weekday: "long", month: "short", day: "numeric", timeZone: tz });
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function durationLabel(startIso: string, endIso: string): string {
  const dur = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000));
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
