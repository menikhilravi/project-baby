"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Footprints, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logKick, undoLastKick } from "../actions";

type Kick = { id: number; occurred_at: string };

const TWO_HOURS_MS = 2 * 60 * 60_000;
const FIVE_MIN_MS = 5 * 60_000;
const GOAL = 10;

export function KickCounter({
  coupleId,
  canLog,
  initialKicks,
}: {
  coupleId: string | null;
  canLog: boolean;
  initialKicks: Kick[];
}) {
  const [kicks, setKicks] = useState<Kick[]>(initialKicks);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  // Tick every 30s so kicks aging past the 2h window fall off without a refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Realtime: any kick INSERT/DELETE for the couple updates local state.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kicks_page")
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
            };
            if (row.kind !== "kick") return;
            setKicks((cur) => {
              if (cur.some((k) => k.id === row.id)) return cur;
              // Drop any optimistic temp kicks (negative ids) within 3s — the
              // real row from realtime replaces them.
              const realRowAt = new Date(row.occurred_at).getTime();
              const pruned = cur.filter(
                (k) =>
                  k.id > 0 ||
                  Math.abs(new Date(k.occurred_at).getTime() - realRowAt) > 3000,
              );
              return [
                { id: row.id, occurred_at: row.occurred_at },
                ...pruned,
              ];
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: number };
            setKicks((cur) => cur.filter((k) => k.id !== row.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const recent = useMemo(
    () => kicks.filter((k) => now - new Date(k.occurred_at).getTime() < TWO_HOURS_MS),
    [kicks, now],
  );
  const count = recent.length;
  const reachedTen = count >= GOAL;
  const timeToTen = useMemo(() => {
    if (!reachedTen) return null;
    // recent[] is desc by occurred_at — index 0 is newest.
    const sortedAsc = [...recent].sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
    );
    const first = sortedAsc[0];
    const tenth = sortedAsc[GOAL - 1];
    if (!first || !tenth) return null;
    return (
      new Date(tenth.occurred_at).getTime() -
      new Date(first.occurred_at).getTime()
    );
  }, [recent, reachedTen]);

  const canUndo = useMemo(() => {
    const newest = kicks[0];
    if (!newest) return false;
    return now - new Date(newest.occurred_at).getTime() < FIVE_MIN_MS;
  }, [kicks, now]);

  const handleTap = () => {
    if (!canLog) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(15);
    }
    // Optimistic insert with a negative id; realtime reconciles.
    const tempId = -Date.now();
    setKicks((cur) => [
      { id: tempId, occurred_at: new Date().toISOString() },
      ...cur,
    ]);
    startTransition(async () => {
      try {
        await logKick();
      } catch (err) {
        console.error(err);
        setKicks((cur) => cur.filter((k) => k.id !== tempId));
      }
    });
  };

  const handleUndo = () => {
    if (!canUndo) return;
    const newest = kicks[0];
    if (!newest) return;
    setKicks((cur) => cur.slice(1));
    startTransition(async () => {
      try {
        await undoLastKick();
      } catch (err) {
        console.error(err);
        // Restore on failure
        setKicks((cur) => [newest, ...cur]);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <TapButton
        count={count}
        goal={GOAL}
        reachedTen={reachedTen}
        disabled={!canLog || pending}
        onClick={handleTap}
      />

      <div className="text-center min-h-[2.5rem]">
        {reachedTen && timeToTen !== null ? (
          <p className="text-sm font-medium text-kicks">
            10 kicks in {formatDuration(timeToTen)} — strong session ✦
          </p>
        ) : count > 0 ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {count}
            </span>{" "}
            {count === 1 ? "kick" : "kicks"} in the last 2 hours
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {canLog
              ? "Tap the button each time you feel a kick."
              : "Only mom can log kicks."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo || !canLog || pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium",
          "border border-border/60 bg-card/60 text-muted-foreground transition-all",
          "hover:bg-card hover:text-foreground hover:shadow-sm",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card/60",
        )}
      >
        <Undo2 className="h-3.5 w-3.5" />
        Undo last tap
      </button>
    </div>
  );
}

function TapButton({
  count,
  goal,
  reachedTen,
  disabled,
  onClick,
}: {
  count: number;
  goal: number;
  reachedTen: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const pct = Math.min(count / goal, 1);
  return (
    <div className="relative aspect-square w-full max-w-[18rem]">
      <ProgressRing pct={pct} reachedTen={reachedTen} />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "absolute inset-[12%] rounded-full grid place-items-center transition-all",
          "bg-kicks-soft text-kicks border border-kicks/30 shadow-sm",
          "hover:shadow-md hover:scale-[1.01] active:scale-[0.97]",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
          reachedTen && "ring-4 ring-kicks/30",
        )}
        aria-label="Log a kick"
      >
        <div className="flex flex-col items-center gap-1">
          <Footprints className="h-8 w-8" />
          <span className="font-display text-5xl font-semibold tabular-nums leading-none">
            {count}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-kicks/80">
            of {goal}
          </span>
        </div>
      </button>
    </div>
  );
}

function ProgressRing({
  pct,
  reachedTen,
}: {
  pct: number;
  reachedTen: boolean;
}) {
  const size = 100;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-border/40"
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
          reachedTen ? "text-kicks" : "text-kicks/70",
        )}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  );
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60_000));
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
