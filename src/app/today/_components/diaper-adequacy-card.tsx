"use client";

import { useEffect, useState } from "react";
import { Check, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { diaperGuidance, tallyDiapers } from "@/lib/newborn-health";

export type DiaperRow = { subtype: string | null; occurred_at: string };

/**
 * Turns today's diaper taps into the reassurance parents actually want in the
 * newborn weeks: "enough wet + dirty for the day?". Counts accumulate, so an
 * unmet target reads as "building", never an alarm. Local-day filtering is done
 * on mount to match the viewer's clock (rows arrive as the last ~30h UTC).
 */
export function DiaperAdequacyCard({
  rows,
  birthDate,
}: {
  rows: DiaperRow[];
  birthDate: string | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);
  if (!now) return null;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todays = rows.filter(
    (r) => new Date(r.occurred_at) >= startOfDay,
  );
  const counts = tallyDiapers(todays);
  const g = diaperGuidance(counts, birthDate, now);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        g.status === "good" ? "border-hospital/40 bg-hospital-soft/40" : "border-border",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="h-4 w-4 text-sky-500" />
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex-1">
          Diapers today
        </p>
        {g.status === "good" ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-hospital">
            <Check className="h-3.5 w-3.5" /> On track
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Wet" value={g.wet} target={g.targetWet} met={g.wetMet} />
        <Stat label="Dirty" value={g.dirty} target={g.targetDirty} met={g.dirtyMet} />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{g.note}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  target,
  met,
}: {
  label: string;
  value: number;
  target: number;
  met: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="font-display nums text-2xl font-bold leading-tight tabular-nums">
        {value}
        <span
          className={cn(
            "text-sm font-normal",
            met ? "text-hospital" : "text-muted-foreground",
          )}
        >
          {" "}
          / {target}
        </span>
      </p>
    </div>
  );
}
