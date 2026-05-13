"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Droplets, Moon, Trash2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logEvent, toggleSleep, removeEvent } from "../actions";

export type BabyEventRow = {
  id: number;
  user_id: string;
  couple_id: string | null;
  kind: "feed" | "diaper" | "sleep";
  occurred_at: string;
  ended_at: string | null;
  notes: string | null;
};

export type RoleMap = Record<string, "mom" | "dad" | null>;

type Props = {
  initialEvents: BabyEventRow[];
  currentUserId: string;
  coupleId: string | null;
  roleMap: RoleMap;
};

const KIND_META = {
  feed: { label: "Feed", icon: Utensils, accent: "text-amber-500" },
  diaper: { label: "Diaper", icon: Droplets, accent: "text-sky-500" },
  sleep: { label: "Sleep", icon: Moon, accent: "text-indigo-400" },
} as const;

export function Logger({
  initialEvents,
  currentUserId,
  coupleId,
  roleMap,
}: Props) {
  const [events, setEvents] = useState<BabyEventRow[]>(initialEvents);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("baby_events_live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "baby_events",
          ...(coupleId ? { filter: `couple_id=eq.${coupleId}` } : {}),
        },
        (payload) => {
          setEvents((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as BabyEventRow;
              if (prev.some((e) => e.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as BabyEventRow;
              return prev.map((e) => (e.id === row.id ? row : e));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as { id: number };
              return prev.filter((e) => e.id !== row.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const openSleep = useMemo(
    () => events.find((e) => e.kind === "sleep" && e.ended_at === null),
    [events],
  );

  const handleLog = (kind: "feed" | "diaper") => {
    startTransition(async () => {
      try {
        await logEvent(kind);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSleep = () => {
    startTransition(async () => {
      try {
        await toggleSleep();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <LogButton
          kind="feed"
          onClick={() => handleLog("feed")}
          disabled={pending}
        />
        <LogButton
          kind="diaper"
          onClick={() => handleLog("diaper")}
          disabled={pending}
        />
        <LogButton
          kind="sleep"
          onClick={handleSleep}
          disabled={pending}
          active={Boolean(openSleep)}
          sublabel={openSleep ? "Tap to wake" : undefined}
        />
      </div>

      {openSleep ? (
        <SleepingBanner startedAt={openSleep.occurred_at} />
      ) : null}

      <Timeline
        events={events}
        currentUserId={currentUserId}
        roleMap={roleMap}
      />
    </div>
  );
}

function LogButton({
  kind,
  onClick,
  disabled,
  active,
  sublabel,
}: {
  kind: "feed" | "diaper" | "sleep";
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  sublabel?: string;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group rounded-3xl border bg-card px-3 py-5 flex flex-col items-center gap-2 transition-all",
        "hover:bg-card/80 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        active && "bg-logger-soft border-logger ring-2 ring-logger/30",
      )}
    >
      <span
        className={cn(
          "grid place-items-center h-12 w-12 rounded-2xl ring-1 ring-border/40 transition-colors",
          active ? "bg-logger text-white" : cn("bg-muted/60", meta.accent),
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-sm font-semibold tracking-tight">
        {meta.label}
      </span>
      {sublabel ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {sublabel}
        </span>
      ) : null}
    </button>
  );
}

function SleepingBanner({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <div className="rounded-2xl border border-logger/30 bg-logger-soft/60 px-4 py-3 flex items-center gap-3">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-logger text-white">
        <Moon className="h-4.5 w-4.5" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">Sleeping</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {h > 0 ? `${h}h ` : ""}
          {m}m so far
        </p>
      </div>
    </div>
  );
}

function Timeline({
  events,
  currentUserId,
  roleMap,
}: {
  events: BabyEventRow[];
  currentUserId: string;
  roleMap: RoleMap;
}) {
  const [, startTransition] = useTransition();
  const grouped = useMemo(() => groupByDay(events), [events]);

  const handleRemove = (id: number) => {
    startTransition(async () => {
      try {
        await removeEvent(id);
      } catch (err) {
        console.error(err);
      }
    });
  };

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No events yet — tap a button above to log the first one.
        </p>
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
          <ul className="space-y-2">
            {rows.map((row) => (
              <TimelineRow
                key={row.id}
                row={row}
                isMine={row.user_id === currentUserId}
                role={roleMap[row.user_id] ?? null}
                onRemove={() => handleRemove(row.id)}
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
  onRemove,
}: {
  row: BabyEventRow;
  isMine: boolean;
  role: "mom" | "dad" | null;
  onRemove: () => void;
}) {
  const meta = KIND_META[row.kind];
  const Icon = meta.icon;
  const who = isMine ? "You" : role ? capitalize(role) : "Partner";
  const time = formatTime(row.occurred_at);

  let detail: string | null = null;
  if (row.kind === "sleep") {
    if (row.ended_at) {
      const dur = Math.max(
        0,
        Math.round(
          (new Date(row.ended_at).getTime() -
            new Date(row.occurred_at).getTime()) /
            60_000,
        ),
      );
      const h = Math.floor(dur / 60);
      const m = dur % 60;
      detail = `${h > 0 ? `${h}h ` : ""}${m}m`;
    } else {
      detail = "ongoing";
    }
  }

  return (
    <li className="group flex items-center gap-3 rounded-2xl border bg-card pl-3 pr-2 py-2.5">
      <span
        className={cn(
          "grid place-items-center h-9 w-9 rounded-xl bg-muted/60 ring-1 ring-border/40 shrink-0",
          meta.accent,
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{meta.label}</span>
          {detail ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {detail}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {time} · {who}
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove event"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

