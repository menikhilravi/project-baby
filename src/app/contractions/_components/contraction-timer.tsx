"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Activity, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  assessLabor,
  computeContractionStats,
  formatClock,
  type Contraction,
  type LaborLevel,
} from "@/lib/contractions";
import {
  startContraction,
  stopContraction,
  deleteContraction,
} from "../actions";

// Ring fills over a typical contraction length (~90s) while one is in progress.
const CONTRACTION_TARGET_MS = 90_000;

export function ContractionTimer({
  coupleId,
  canLog,
  initial,
}: {
  coupleId: string | null;
  canLog: boolean;
  initial: Contraction[];
}) {
  const [contractions, setContractions] = useState<Contraction[]>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  // Tick every second so the live elapsed timer and "time since last" stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Realtime: contraction start (INSERT), end (UPDATE), and deletes for the couple.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("contractions_page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "baby_events",
          ...(coupleId ? { filter: `couple_id=eq.${coupleId}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as {
              id: number;
              kind: string;
              occurred_at: string;
              ended_at: string | null;
            };
            if (row.kind !== "contraction") return;
            setContractions((cur) => {
              if (cur.some((c) => c.id === row.id)) return cur;
              // Reconcile any optimistic temp start (negative id) within 3s,
              // carrying over an optimistic end if the user already stopped it.
              const realAt = new Date(row.occurred_at).getTime();
              let carriedEnd: string | null = row.ended_at;
              const pruned = cur.filter((c) => {
                const isTempMatch =
                  c.id < 0 &&
                  Math.abs(new Date(c.start).getTime() - realAt) < 3000;
                if (isTempMatch && c.end) carriedEnd = c.end;
                return !isTempMatch;
              });
              return [
                { id: row.id, start: row.occurred_at, end: carriedEnd },
                ...pruned,
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as {
              id: number;
              kind: string;
              occurred_at: string;
              ended_at: string | null;
            };
            if (row.kind !== "contraction") return;
            setContractions((cur) =>
              cur.map((c) =>
                c.id === row.id
                  ? { id: row.id, start: row.occurred_at, end: row.ended_at }
                  : c,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: number };
            setContractions((cur) => cur.filter((c) => c.id !== row.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  // Newest first for display.
  const ordered = useMemo(
    () =>
      [...contractions].sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
      ),
    [contractions],
  );
  const current = ordered[0] ?? null;
  const inProgress = current !== null && current.end === null;

  const stats = useMemo(
    () => computeContractionStats(contractions, now),
    [contractions, now],
  );
  const assessment = useMemo(() => assessLabor(stats), [stats]);

  const elapsedMs = inProgress
    ? now - new Date(current!.start).getTime()
    : null;
  const sinceLastMs =
    !inProgress && current?.end
      ? now - new Date(current.end).getTime()
      : null;

  const handleTap = () => {
    if (!canLog || pending) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(inProgress ? [10, 40, 10] : 20);
    }
    if (inProgress) {
      // Optimistically close the open contraction.
      const openId = current!.id;
      const endIso = new Date().toISOString();
      setContractions((cur) =>
        cur.map((c) => (c.id === openId ? { ...c, end: endIso } : c)),
      );
      startTransition(async () => {
        try {
          await stopContraction();
        } catch (err) {
          console.error(err);
          setContractions((cur) =>
            cur.map((c) => (c.id === openId ? { ...c, end: null } : c)),
          );
        }
      });
    } else {
      // Optimistically open a new contraction with a temp id.
      const tempId = -Date.now();
      setContractions((cur) => [
        { id: tempId, start: new Date().toISOString(), end: null },
        ...cur,
      ]);
      startTransition(async () => {
        try {
          await startContraction();
        } catch (err) {
          console.error(err);
          setContractions((cur) => cur.filter((c) => c.id !== tempId));
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!canLog || pending) return;
    const removed = contractions.find((c) => c.id === id);
    setContractions((cur) => cur.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        if (id > 0) await deleteContraction(id);
      } catch (err) {
        console.error(err);
        if (removed) setContractions((cur) => [removed, ...cur]);
      }
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center gap-5">
        <TapButton
          inProgress={inProgress}
          elapsedMs={elapsedMs}
          sinceLastMs={sinceLastMs}
          disabled={!canLog || pending}
          onClick={handleTap}
        />
        <p className="text-sm text-muted-foreground text-center min-h-[1.25rem]">
          {!canLog
            ? "Only mom can time contractions."
            : inProgress
              ? "Tightening — tap again when it eases."
              : current
                ? "Resting. Tap when the next one starts."
                : "Tap the moment a contraction begins."}
        </p>
      </div>

      <AssessmentCard
        level={assessment.level}
        title={assessment.title}
        message={assessment.message}
      />

      <StatRow
        avgFrequencyMs={stats.avgFrequencyMs}
        avgDurationMs={stats.avgDurationMs}
        regular={
          stats.frequencyCv === null ? null : stats.frequencyCv < 0.28
        }
        countLastHour={stats.completed.length + (stats.inProgress ? 1 : 0)}
      />

      <ContractionLog
        ordered={ordered}
        now={now}
        canLog={canLog}
        onDelete={handleDelete}
      />

      <p className="text-[11px] leading-relaxed text-muted-foreground/70 border-t border-border pt-4">
        This is a timer, not medical advice. Trust your body — call your provider
        or go to your birth place if contractions are 5 minutes apart for an hour,
        your water breaks, you have bleeding, reduced baby movement, or anything
        feels off.
      </p>
    </div>
  );
}

function TapButton({
  inProgress,
  elapsedMs,
  sinceLastMs,
  disabled,
  onClick,
}: {
  inProgress: boolean;
  elapsedMs: number | null;
  sinceLastMs: number | null;
  disabled: boolean;
  onClick: () => void;
}) {
  const pct = inProgress
    ? Math.min((elapsedMs ?? 0) / CONTRACTION_TARGET_MS, 1)
    : 0;
  return (
    <div className="relative aspect-square w-full max-w-[20rem]">
      <ProgressRing pct={pct} active={inProgress} />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "absolute inset-[10%] rounded-full grid place-items-center transition-all duration-200",
          "bg-card text-foreground border",
          "hover:scale-[1.015] active:scale-[0.97]",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
          inProgress
            ? "shadow-[0_0_60px_-12px] shadow-contractions/60 border-contractions/40"
            : "shadow-[0_0_50px_-20px] shadow-contractions/40 border-border",
        )}
        aria-label={inProgress ? "End contraction" : "Start contraction"}
      >
        <div className="flex flex-col items-center gap-1.5">
          {inProgress ? (
            <>
              <Square className="h-6 w-6 text-contractions fill-contractions" />
              <span className="font-display nums text-6xl font-bold leading-[0.9] text-foreground tabular-nums">
                {formatMMSS(elapsedMs ?? 0)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-contractions">
                Contraction
              </span>
            </>
          ) : (
            <>
              <Activity className="h-7 w-7 text-contractions/70" />
              <span className="font-display nums text-4xl font-bold leading-[0.95] text-foreground tabular-nums">
                {sinceLastMs !== null ? formatClock(sinceLastMs) : "Ready"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground">
                {sinceLastMs !== null ? "since last" : "tap to start"}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}

function ProgressRing({ pct, active }: { pct: number; active: boolean }) {
  const size = 100;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("absolute inset-0 -rotate-90", active && "animate-pulse")}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className={cn(
          "transition-all duration-300 ease-out",
          active ? "text-contractions" : "text-contractions/40",
        )}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  );
}

const LEVEL_STYLES: Record<
  LaborLevel,
  { wrap: string; dot: string; title: string }
> = {
  waiting: {
    wrap: "border-border bg-card",
    dot: "bg-muted-foreground/40",
    title: "text-foreground",
  },
  braxton: {
    wrap: "border-border bg-card",
    dot: "bg-muted-foreground/60",
    title: "text-foreground",
  },
  early: {
    wrap: "border-contractions/30 bg-contractions-soft/40",
    dot: "bg-contractions",
    title: "text-contractions",
  },
  active: {
    wrap: "border-contractions/60 bg-contractions-soft/70 shadow-[0_0_50px_-18px] shadow-contractions/70",
    dot: "bg-contractions animate-pulse",
    title: "text-contractions",
  },
};

function AssessmentCard({
  level,
  title,
  message,
}: {
  level: LaborLevel;
  title: string;
  message: string;
}) {
  const s = LEVEL_STYLES[level];
  return (
    <div className={cn("rounded-2xl border p-5", s.wrap)}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className={cn("h-2 w-2 rounded-full", s.dot)} />
        <h2 className={cn("text-[15px] font-semibold tracking-tight", s.title)}>
          {title}
        </h2>
      </div>
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function StatRow({
  avgFrequencyMs,
  avgDurationMs,
  regular,
  countLastHour,
}: {
  avgFrequencyMs: number | null;
  avgDurationMs: number | null;
  regular: boolean | null;
  countLastHour: number;
}) {
  const cells: { label: string; value: string }[] = [
    {
      label: "Apart",
      value: avgFrequencyMs !== null ? formatClock(avgFrequencyMs) : "—",
    },
    {
      label: "Lasting",
      value: avgDurationMs !== null ? formatClock(avgDurationMs) : "—",
    },
    {
      label: "Rhythm",
      value: regular === null ? "—" : regular ? "Regular" : "Irregular",
    },
    { label: "Last hour", value: String(countLastHour) },
  ];
  return (
    <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border">
      {cells.map((c) => (
        <div key={c.label} className="bg-card px-2 py-4 text-center">
          <p className="font-display text-xl font-bold tracking-tight tabular-nums">
            {c.value}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function ContractionLog({
  ordered,
  now,
  canLog,
  onDelete,
}: {
  ordered: Contraction[];
  now: number;
  canLog: boolean;
  onDelete: (id: number) => void;
}) {
  if (ordered.length === 0) {
    return (
      <div>
        <h3 className="text-[13px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-3">
          Timeline
        </h3>
        <p className="text-sm text-muted-foreground">
          No contractions timed yet.
        </p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-[13px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-1">
        Timeline
      </h3>
      <ul>
        {ordered.map((c, i) => {
          const startMs = new Date(c.start).getTime();
          const endMs = c.end ? new Date(c.end).getTime() : null;
          const live = endMs === null;
          const durationMs = live ? now - startMs : endMs - startMs;
          // Gap = start-to-start with the previous (older) contraction.
          const prev = ordered[i + 1];
          const gapMs = prev
            ? startMs - new Date(prev.start).getTime()
            : null;
          return (
            <li
              key={c.id}
              className="group flex items-center gap-3 border-t border-border py-3.5 first:border-t-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium tracking-tight tabular-nums">
                  {new Date(c.start).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {live ? (
                    <span className="ml-2 text-contractions font-semibold">
                      now
                    </span>
                  ) : null}
                </p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5 tabular-nums">
                  {live ? "in progress" : `lasted ${formatClock(durationMs)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-medium tabular-nums">
                  {gapMs !== null ? formatClock(gapMs) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">apart</p>
              </div>
              {canLog ? (
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  aria-label="Delete contraction"
                  className="shrink-0 grid place-items-center h-8 w-8 rounded-lg text-muted-foreground/50 transition-colors hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
