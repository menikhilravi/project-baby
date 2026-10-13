"use client";

import { useEffect, useState } from "react";
import { Check, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export type TummyRow = { occurred_at: string; ended_at: string | null };

const GOAL_MIN = 30;

/**
 * Total tummy time logged today vs a gentle daily goal. Supervised tummy time
 * builds the muscles for rolling and head control. Local-day filtering on
 * mount (rows arrive as the last ~30h UTC).
 */
export function TummyTimeCard({ rows }: { rows: TummyRow[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);
  if (!now) return null;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const minutes = rows.reduce((sum, r) => {
    if (!r.ended_at) return sum;
    const start = new Date(r.occurred_at);
    if (start < startOfDay) return sum;
    return sum + (new Date(r.ended_at).getTime() - start.getTime()) / 60_000;
  }, 0);
  const total = Math.round(minutes);
  const met = total >= GOAL_MIN;
  const pct = Math.min(100, Math.round((total / GOAL_MIN) * 100));

  return (
    <div
      className={cn(
        "rounded-card border border-border/60 bg-card p-5 shadow-soft",
        met ? "border-kind-tummy/40 bg-kind-tummy-soft/60" : "border-border",
      )}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Timer className="h-4 w-4 text-kind-tummy" />
        <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex-1">
          Tummy time today
        </p>
        {met ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-kind-tummy-strong">
            <Check className="h-3.5 w-3.5" /> Goal met
          </span>
        ) : null}
      </div>
      <p className="font-display nums text-3xl font-semibold leading-tight tabular-nums">
        {total}
        <span className="text-sm font-normal text-muted-foreground">
          {" "}
          / ~{GOAL_MIN} min
        </span>
      </p>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", met ? "bg-kind-tummy" : "bg-kind-tummy")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {total === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Log a few minutes from the Tummy button above.
        </p>
      ) : null}
    </div>
  );
}
