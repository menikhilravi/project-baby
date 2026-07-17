"use client";

import { useEffect, useState } from "react";
import { Moon, Droplets, Utensils, Pill } from "lucide-react";
import { subtypeLabel } from "@/lib/baby-events";
import { formatDuration } from "@/lib/baby-stats";
import { predictNextNap, type SleepInterval } from "@/lib/wake-window";

type LastEvent = { occurred_at: string; subtype: string | null };
type RawSleep = { occurred_at: string; ended_at: string | null };

function ago(iso: string, now: Date): string {
  const min = (now.getTime() - new Date(iso).getTime()) / 60_000;
  if (min < 1) return "just now";
  return `${formatDuration(min)} ago`;
}

function clockRange(a: Date, b: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${fmt(a)} – ${fmt(b)}`;
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Moon;
  label: string;
  value: string;
  sub?: string;
  tone?: "alert";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p
        className={
          tone === "alert"
            ? "mt-1.5 text-lg font-semibold text-destructive"
            : "mt-1.5 text-lg font-semibold"
        }
      >
        {value}
      </p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function HandoffStatus({
  birthDate,
  lastFeed,
  lastDiaper,
  sleeps,
  lastVitaminDIso,
}: {
  birthDate: string | null;
  lastFeed: LastEvent | null;
  lastDiaper: LastEvent | null;
  sleeps: RawSleep[];
  lastVitaminDIso: string | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="h-40 rounded-3xl bg-muted animate-pulse" />;
  }

  const intervals: SleepInterval[] = sleeps.map((s) => ({
    start: new Date(s.occurred_at),
    end: s.ended_at ? new Date(s.ended_at) : null,
  }));
  const openSleep = intervals.find((s) => s.end === null);
  const nap = predictNextNap(birthDate, intervals, now);

  let sleepValue = "No sleep logged";
  let sleepSub: string | undefined;
  if (openSleep) {
    sleepValue = "Asleep now";
    sleepSub = `since ${openSleep.start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  } else if (nap.status === "ok") {
    sleepValue = nap.overdue ? "Ready for a nap" : "Next nap";
    sleepSub = nap.overdue
      ? "overdue — watch for sleepy cues"
      : `~${clockRange(nap.windowStart, nap.windowEnd)}`;
  } else if (nap.status === "sleeping") {
    sleepValue = "Asleep now";
  }

  const vitDToday = lastVitaminDIso
    ? isSameLocalDay(lastVitaminDIso, now)
    : false;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        icon={Utensils}
        label="Last feed"
        value={lastFeed ? ago(lastFeed.occurred_at, now) : "None logged"}
        sub={
          lastFeed
            ? (subtypeLabel(lastFeed.subtype) ?? undefined)
            : undefined
        }
      />
      <Tile
        icon={Droplets}
        label="Last diaper"
        value={lastDiaper ? ago(lastDiaper.occurred_at, now) : "None logged"}
        sub={
          lastDiaper
            ? (subtypeLabel(lastDiaper.subtype) ?? undefined)
            : undefined
        }
      />
      <Tile icon={Moon} label="Sleep" value={sleepValue} sub={sleepSub} />
      <Tile
        icon={Pill}
        label="Vitamin D"
        value={vitDToday ? "Given today" : "Not yet today"}
      />
    </div>
  );
}
