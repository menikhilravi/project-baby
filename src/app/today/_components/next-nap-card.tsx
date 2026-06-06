"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import {
  type SleepInterval,
  predictNextNap,
} from "@/lib/wake-window";

export type RawSleep = { occurred_at: string; ended_at: string | null };

/**
 * SweetSpot-lite. Re-evaluates each minute so an "overdue" window updates
 * live. Renders nothing when there's not enough to predict (no clutter).
 */
export function NextNapCard({
  birthDate,
  sleeps,
}: {
  birthDate: string | null;
  sleeps: RawSleep[];
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Defer to mount so the local-clock prediction never mismatches SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Avoid SSR/hydration mismatch — only compute once mounted (local clock).
  if (!now) return null;

  const intervals: SleepInterval[] = sleeps.map((s) => ({
    start: new Date(s.occurred_at),
    end: s.ended_at ? new Date(s.ended_at) : null,
  }));
  const p = predictNextNap(birthDate, intervals, now);
  if (p.status !== "ok") return null;

  const range = `${fmt(p.windowStart)} – ${fmt(p.windowEnd)}`;

  return (
    <div className="rounded-2xl border border-reports/30 bg-reports-soft/50 px-4 py-3 flex items-center gap-3">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-reports text-white shrink-0">
        <Moon className="h-4.5 w-4.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {p.overdue ? "Nap window now" : "Next nap window"}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {range} · {p.confidence} confidence
        </p>
      </div>
    </div>
  );
}

function fmt(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
