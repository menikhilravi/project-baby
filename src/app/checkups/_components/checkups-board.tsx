"use client";

import { useState, useTransition } from "react";
import { Check, CircleAlert, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { doseKey } from "@/data/immunizations";
import type { VisitStatus } from "@/lib/checkups";
import { setVaccineDose, upsertVisit } from "../actions";
import type { VisitVM } from "../page";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_META: Record<
  VisitStatus,
  { label: string; className: string; icon: typeof Check }
> = {
  done: {
    label: "Done",
    className: "bg-hospital-soft text-hospital",
    icon: Check,
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive/10 text-destructive",
    icon: CircleAlert,
  },
  soon: {
    label: "Soon",
    className: "bg-checkups-soft text-checkups",
    icon: Clock,
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-muted text-muted-foreground",
    icon: Clock,
  },
};

export function CheckupsBoard({
  visits,
  hasBirthDate,
}: {
  visits: VisitVM[];
  hasBirthDate: boolean;
}) {
  // Optimistic set of given dose keys, seeded from the server view model.
  const [given, setGiven] = useState<Set<string>>(
    () =>
      new Set(
        visits.flatMap((v) =>
          v.vaccines.filter((x) => x.given).map((x) => doseKey(x.code, x.dose)),
        ),
      ),
  );
  const [done, setDone] = useState<Set<string>>(
    () => new Set(visits.filter((v) => v.completed).map((v) => v.slug)),
  );
  const [, startTransition] = useTransition();

  const totalDoses = visits.reduce((n, v) => n + v.vaccines.length, 0);
  const givenCount = given.size;

  function toggleDose(code: string, dose: string) {
    const key = doseKey(code, dose);
    const next = new Set(given);
    const nowGiven = !next.has(key);
    if (nowGiven) next.add(key);
    else next.delete(key);
    setGiven(next);
    startTransition(async () => {
      try {
        await setVaccineDose(code, dose, nowGiven);
      } catch {
        // Roll back on failure.
        setGiven((cur) => {
          const rb = new Set(cur);
          if (nowGiven) rb.delete(key);
          else rb.add(key);
          return rb;
        });
      }
    });
  }

  function toggleVisit(v: VisitVM) {
    const next = new Set(done);
    const nowDone = !next.has(v.slug);
    if (nowDone) next.add(v.slug);
    else next.delete(v.slug);
    setDone(next);
    startTransition(async () => {
      try {
        await upsertVisit({
          slug: v.slug,
          title: `${v.label} checkup`,
          scheduledFor: v.dueISO ?? new Date().toISOString(),
          completed: nowDone,
        });
      } catch {
        setDone((cur) => {
          const rb = new Set(cur);
          if (nowDone) rb.delete(v.slug);
          else rb.add(v.slug);
          return rb;
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-display nums text-2xl font-bold text-foreground">
            {givenCount}
          </span>{" "}
          of {totalDoses} doses recorded
        </p>
        {!hasBirthDate ? (
          <p className="text-xs text-muted-foreground">
            Add a birth date in Settings to see visit due dates.
          </p>
        ) : null}
      </div>

      {visits.map((v) => {
        const isDone = done.has(v.slug);
        const status: VisitStatus | null = v.status
          ? isDone
            ? "done"
            : v.status === "done"
              ? "upcoming"
              : v.status
          : isDone
            ? "done"
            : null;
        const meta = status ? STATUS_META[status] : null;
        const StatusIcon = meta?.icon;
        return (
          <Card key={v.slug}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-baseline gap-2">
                  <span>{v.label}</span>
                  {v.dueISO ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {fmtDate(v.dueISO)}
                    </span>
                  ) : null}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {meta && StatusIcon ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        meta.className,
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleVisit(v)}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full border transition-colors",
                      isDone
                        ? "border-hospital bg-hospital text-background"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                    aria-label={isDone ? "Mark visit not done" : "Mark visit done"}
                    aria-pressed={isDone}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            {v.vaccines.length > 0 ? (
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {v.vaccines.map((vac) => {
                    const key = doseKey(vac.code, vac.dose);
                    const on = given.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDose(vac.code, vac.dose)}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                          "hover:bg-muted active:scale-[0.97]",
                          on
                            ? "border-checkups/50 bg-checkups-soft text-checkups"
                            : "border-border bg-card text-foreground",
                        )}
                      >
                        {on ? <Check className="h-3.5 w-3.5" /> : null}
                        {vac.label}
                        {vac.dose !== "yearly" ? (
                          <span className="text-xs text-muted-foreground">
                            #{vac.dose}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            ) : null}
          </Card>
        );
      })}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        A reference to help you keep track — not medical advice. Your
        pediatrician sets the actual schedule; brands, timing, and catch-ups
        vary.
      </p>
    </div>
  );
}
