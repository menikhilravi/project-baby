"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export type KickRow = { id: number; occurred_at: string };

const BIN_START_HOURS = [6, 8, 10, 12, 14, 16, 18, 20] as const;
const BIN_END_HOURS = [8, 10, 12, 14, 16, 18, 20, 22] as const;
const GOAL = 10;

export function TwoHourBins({
  kicks: initialKicks,
  coupleId,
}: {
  kicks: KickRow[];
  coupleId: string | null;
}) {
  const [kicks, setKicks] = useState<KickRow[]>(initialKicks);

  // Stay in sync with realtime: KickCounter inserts via its own channel; we
  // listen for INSERT/DELETE here so the bins update without a page refresh.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kicks_bins")
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
            setKicks((cur) =>
              cur.some((k) => k.id === row.id)
                ? cur
                : [{ id: row.id, occurred_at: row.occurred_at }, ...cur],
            );
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

  // Tick every minute so the "current bin" highlight & today/tomorrow
  // boundary stay correct without a refresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { bins, totalToday, outsideHours, currentBinIdx } = useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const todaysKicks = kicks.filter((k) => {
      const t = new Date(k.occurred_at);
      return t >= startOfToday && t < startOfTomorrow;
    });

    const binsArr = BIN_START_HOURS.map(() => 0);
    let outside = 0;
    for (const k of todaysKicks) {
      const h = new Date(k.occurred_at).getHours();
      const idx = BIN_START_HOURS.findIndex(
        (s, i) => h >= s && h < BIN_END_HOURS[i],
      );
      if (idx === -1) outside++;
      else binsArr[idx]++;
    }

    const nowHour = now.getHours();
    const currentIdx = BIN_START_HOURS.findIndex(
      (s, i) => nowHour >= s && nowHour < BIN_END_HOURS[i],
    );

    return {
      bins: binsArr,
      totalToday: todaysKicks.length,
      outsideHours: outside,
      currentBinIdx: currentIdx,
    };
  }, [kicks, now]);

  const maxBin = Math.max(GOAL, ...bins);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Today by 2-hour window</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalToday} {totalToday === 1 ? "kick" : "kicks"}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
        <ul className="space-y-1.5">
          {BIN_START_HOURS.map((start, i) => {
            const end = BIN_END_HOURS[i];
            const count = bins[i];
            const isCurrent = i === currentBinIdx;
            const isPast =
              currentBinIdx === -1
                ? now.getHours() >= 22
                : i < currentBinIdx;
            const reached = count >= GOAL;
            const pct = Math.min(count / maxBin, 1);
            return (
              <li
                key={start}
                className={cn(
                  "grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
                  isCurrent && "bg-kicks-soft/40 ring-1 ring-kicks/30",
                )}
              >
                <span
                  className={cn(
                    "text-xs tabular-nums font-medium",
                    isCurrent
                      ? "text-kicks"
                      : isPast || count > 0
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {fmtHour(start)}–{fmtHour(end)}
                </span>
                <div className="relative h-3 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      count === 0
                        ? "bg-transparent"
                        : reached
                          ? "bg-kicks"
                          : isCurrent
                            ? "bg-kicks/70"
                            : "bg-kicks/45",
                    )}
                    style={{ width: `${pct * 100}%` }}
                  />
                  {/* goal marker at GOAL/maxBin */}
                  <div
                    className="absolute inset-y-0 w-px bg-foreground/30"
                    style={{ left: `${(GOAL / maxBin) * 100}%` }}
                    aria-hidden
                  />
                </div>
                <span
                  className={cn(
                    "text-xs tabular-nums font-semibold text-right",
                    reached
                      ? "text-kicks"
                      : count === 0 && !isPast && !isCurrent
                        ? "text-muted-foreground/40"
                        : "text-foreground",
                  )}
                >
                  {count === 0 && !isPast && !isCurrent ? "—" : count}
                </span>
              </li>
            );
          })}
        </ul>
        {outsideHours > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            {outsideHours} {outsideHours === 1 ? "kick" : "kicks"} outside 6 AM – 10 PM
          </p>
        ) : null}
      </div>
    </section>
  );
}

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}
