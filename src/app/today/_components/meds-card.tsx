"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { medLabel } from "@/lib/baby-events";
import { logMed } from "@/app/log/actions";

export type MedRow = {
  subtype: string | null;
  amount: number | null;
  unit: string | null;
  occurred_at: string;
};

/**
 * Two jobs: a one-tap daily Vitamin D check (AAP: 400 IU/day for breastfed
 * babies from the first days), and a "what was given, when" list for the last
 * 24h so partners don't double-dose. Local-day filtering happens on mount.
 */
export function MedsCard({ rows }: { rows: MedRow[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);
  if (!now) return null;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const vitaminDToday = rows.find(
    (r) => r.subtype === "vitamin_d" && new Date(r.occurred_at) >= startOfDay,
  );
  const recent = rows
    .filter((r) => new Date(r.occurred_at) >= dayAgo)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 4);

  const giveVitaminD = () =>
    startTransition(async () => {
      try {
        await logMed({ subtype: "vitamin_d", amount: 400, unit: "iu" });
      } catch (err) {
        console.error(err);
      }
    });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Pill className="h-4 w-4 text-violet-500" />
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex-1">
          Medicine
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid place-items-center h-9 w-9 rounded-xl",
            vitaminDToday
              ? "bg-hospital-soft text-hospital"
              : "bg-violet-500/10 text-violet-500",
          )}
        >
          {vitaminDToday ? (
            <Check className="h-4.5 w-4.5" />
          ) : (
            <Pill className="h-4.5 w-4.5" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Vitamin D</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {vitaminDToday
              ? `Given ${fmtTime(vitaminDToday.occurred_at)}`
              : "Not yet today · 400 IU"}
          </p>
        </div>
        {vitaminDToday ? null : (
          <button
            type="button"
            onClick={giveVitaminD}
            disabled={pending}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            Log it
          </button>
        )}
      </div>

      {recent.length > 0 ? (
        <ul className="mt-3 border-t border-border pt-2 space-y-1">
          {recent.map((r, i) => (
            <li
              key={`${r.occurred_at}-${i}`}
              className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums"
            >
              <span className="text-foreground/80">{medLabel(r.subtype)}</span>
              {r.amount != null ? (
                <span>
                  {r.amount}
                  {r.unit ?? ""}
                </span>
              ) : null}
              <span className="ml-auto">{fmtTime(r.occurred_at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
