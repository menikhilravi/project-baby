"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type KickRow = { id: number; occurred_at: string };

export type KickSession = {
  session_start: string;
  session_end: string;
  kick_count: number;
  reached_ten_at: string | null;
};

const BIN_START_HOURS = [6, 8, 10, 12, 14, 16, 18, 20] as const;
const BIN_END_HOURS = [8, 10, 12, 14, 16, 18, 20, 22] as const;

export function Dashboard({
  kicks,
  sessions,
}: {
  kicks: KickRow[];
  sessions: KickSession[];
}) {
  // Defer "now" to client render so day-bucketing uses the user's local
  // timezone (server is UTC on Vercel; was the source of the GMT bug).
  const [now] = useState<Date | null>(() =>
    typeof window === "undefined" ? null : new Date(),
  );
  if (!now) return <DashboardSkeleton />;

  return <DashboardContent now={now} kicks={kicks} sessions={sessions} />;
}

function DashboardContent({
  now,
  kicks,
  sessions,
}: {
  now: Date;
  kicks: KickRow[];
  sessions: KickSession[];
}) {
  // Build 7 days in local time, oldest → newest
  const days = useMemo(() => buildLocalDays(now, 7), [now]);

  // Per-day kick counts and per-window-per-day matrix
  const { perDay, matrix } = useMemo(() => {
    const perDay = days.map(() => 0);
    // matrix[binIdx][dayIdx] = count
    const matrix: number[][] = BIN_START_HOURS.map(() =>
      days.map(() => 0),
    );
    for (const k of kicks) {
      const t = new Date(k.occurred_at);
      const dayIdx = days.findIndex(
        (d) => t >= d.start && t < d.end,
      );
      if (dayIdx === -1) continue;
      perDay[dayIdx]++;
      const h = t.getHours();
      const binIdx = BIN_START_HOURS.findIndex(
        (s, i) => h >= s && h < BIN_END_HOURS[i],
      );
      if (binIdx !== -1) matrix[binIdx][dayIdx]++;
    }
    return { perDay, matrix };
  }, [days, kicks]);

  const totalKicks = perDay.reduce((a, b) => a + b, 0);
  const daysWithAny = perDay.filter((v) => v > 0).length;
  const avgPerActiveDay =
    daysWithAny > 0 ? Math.round((totalKicks / daysWithAny) * 10) / 10 : 0;
  const todayCount = perDay[perDay.length - 1];
  const todayVsAvg =
    daysWithAny > 1 && todayCount > 0
      ? todayCount - Math.round(totalKicks / daysWithAny)
      : null;

  const sessionsReachingTen = sessions.filter((s) => s.reached_ten_at).length;
  const bestTimeToTen = useMemo(() => {
    let best: number | null = null;
    for (const s of sessions) {
      if (!s.reached_ten_at) continue;
      const ms =
        new Date(s.reached_ten_at).getTime() -
        new Date(s.session_start).getTime();
      if (best === null || ms < best) best = ms;
    }
    return best;
  }, [sessions]);

  return (
    <div className="space-y-8">
      {/* Top stats */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Kicks" value={totalKicks} />
        <Stat label="Today" value={todayCount} delta={todayVsAvg} />
        <Stat label="Hit 10" value={sessionsReachingTen} />
        <Stat
          label="Best to 10"
          value={bestTimeToTen !== null ? fmtDuration(bestTimeToTen) : "—"}
        />
      </div>

      <PerDayChart days={days} perDay={perDay} avg={avgPerActiveDay} />

      <WindowHeatmap days={days} matrix={matrix} />

      <TopSessions sessions={sessions} />
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-xl md:text-2xl font-semibold tabular-nums leading-tight">
        {value}
      </p>
      {delta !== undefined && delta !== null && delta !== 0 ? (
        <p
          className={cn(
            "text-[10px] tabular-nums mt-0.5",
            delta > 0 ? "text-kicks" : "text-muted-foreground",
          )}
        >
          {delta > 0 ? "+" : ""}
          {delta} vs avg
        </p>
      ) : null}
    </div>
  );
}

function PerDayChart({
  days,
  perDay,
  avg,
}: {
  days: LocalDay[];
  perDay: number[];
  avg: number;
}) {
  const max = Math.max(1, ...perDay);
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Kicks per day</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          avg {avg}/day
        </p>
      </div>
      <ul className="space-y-1.5 rounded-2xl border border-border/60 bg-card/50 p-3">
        {days.map((d, i) => {
          const count = perDay[i];
          const pct = (count / max) * 100;
          const isToday = i === days.length - 1;
          const isYesterday = i === days.length - 2;
          return (
            <li
              key={d.key}
              className={cn(
                "grid grid-cols-[5rem_1fr_2.5rem] items-center gap-2 rounded-xl px-2 py-1.5",
                isToday && "bg-kicks-soft/40 ring-1 ring-kicks/30",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  isToday
                    ? "text-kicks"
                    : count > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {isToday
                  ? "Today"
                  : isYesterday
                    ? "Yesterday"
                    : d.start.toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
              </span>
              <div className="relative h-3 rounded-full bg-border/40 overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    count === 0
                      ? "bg-transparent"
                      : isToday
                        ? "bg-kicks"
                        : "bg-kicks/50",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-xs tabular-nums font-semibold text-right",
                  count === 0
                    ? "text-muted-foreground/40"
                    : isToday
                      ? "text-kicks"
                      : "text-foreground",
                )}
              >
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WindowHeatmap({
  days,
  matrix,
}: {
  days: LocalDay[];
  matrix: number[][];
}) {
  // Per-window 7-day average + max (for color scaling)
  const windowAvg = matrix.map((row) => {
    const total = row.reduce((a, b) => a + b, 0);
    return Math.round((total / row.length) * 10) / 10;
  });
  const globalMax = Math.max(1, ...matrix.flat());

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight mb-3">
        When kicks happen
      </h2>
      <div className="rounded-2xl border border-border/60 bg-card/50 p-3 overflow-x-auto">
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium pr-2 pb-2">Window</th>
              {days.map((d, i) => (
                <th
                  key={d.key}
                  className={cn(
                    "px-1 pb-2 font-medium text-center",
                    i === days.length - 1 && "text-kicks",
                  )}
                >
                  {i === days.length - 1
                    ? "Tdy"
                    : d.start.toLocaleDateString(undefined, {
                        weekday: "narrow",
                      })}
                </th>
              ))}
              <th className="text-right font-medium pl-2 pb-2">Avg</th>
            </tr>
          </thead>
          <tbody>
            {BIN_START_HOURS.map((start, binIdx) => (
              <tr key={start}>
                <td className="pr-2 py-0.5 text-muted-foreground whitespace-nowrap">
                  {fmtHour(start)}–{fmtHour(BIN_END_HOURS[binIdx])}
                </td>
                {matrix[binIdx].map((count, dayIdx) => {
                  const intensity = count / globalMax;
                  return (
                    <td key={dayIdx} className="px-0.5 py-0.5">
                      <HeatCell count={count} intensity={intensity} />
                    </td>
                  );
                })}
                <td className="pl-2 text-right font-semibold">
                  {windowAvg[binIdx] > 0 ? windowAvg[binIdx] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeatCell({ count, intensity }: { count: number; intensity: number }) {
  // Tailwind needs literal classes, so map intensity to one of N bands.
  const band =
    count === 0
      ? "bg-border/30"
      : intensity < 0.25
        ? "bg-kicks/20"
        : intensity < 0.5
          ? "bg-kicks/40"
          : intensity < 0.75
            ? "bg-kicks/60"
            : "bg-kicks/90";
  return (
    <div
      className={cn(
        "h-7 rounded-md grid place-items-center text-[10px] font-semibold",
        band,
        count === 0 ? "text-muted-foreground/40" : "text-foreground",
        intensity >= 0.75 && "text-white",
      )}
      title={count === 0 ? "0 kicks" : `${count} ${count === 1 ? "kick" : "kicks"}`}
    >
      {count === 0 ? "·" : count}
    </div>
  );
}

function TopSessions({ sessions }: { sessions: KickSession[] }) {
  // Show fastest sessions that reached 10 first, then any other sessions.
  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aT = a.reached_ten_at
        ? new Date(a.reached_ten_at).getTime() -
          new Date(a.session_start).getTime()
        : Infinity;
      const bT = b.reached_ten_at
        ? new Date(b.reached_ten_at).getTime() -
          new Date(b.session_start).getTime()
        : Infinity;
      if (aT !== bT) return aT - bT;
      // tiebreak by most-recent first
      return (
        new Date(b.session_start).getTime() -
        new Date(a.session_start).getTime()
      );
    });
  }, [sessions]);

  if (sorted.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold tracking-tight mb-3">Sessions</h2>
        <div className="rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No kick sessions in the last 7 days.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight mb-3">Sessions</h2>
      <ul className="space-y-2">
        {sorted.map((s) => (
          <SessionRow key={s.session_start} session={s} />
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ session }: { session: KickSession }) {
  const start = new Date(session.session_start);
  const end = new Date(session.session_end);
  const reached = session.reached_ten_at !== null;
  const timeToTenMs = reached
    ? new Date(session.reached_ten_at!).getTime() - start.getTime()
    : null;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {start.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          {" · "}
          {start.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
          {" – "}
          {end.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        {timeToTenMs !== null ? (
          <p className="text-[11px] text-muted-foreground">
            10 in {fmtDuration(timeToTenMs)}
          </p>
        ) : null}
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          reached ? "text-kicks" : "text-muted-foreground",
        )}
      >
        {session.kick_count}
      </span>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-60 rounded-2xl bg-muted animate-pulse" />
      <div className="h-72 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

type LocalDay = { key: string; start: Date; end: Date };

function buildLocalDays(now: Date, count: number): LocalDay[] {
  const days: LocalDay[] = [];
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(todayStart);
    start.setDate(todayStart.getDate() - i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    days.push({
      key: `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
      start,
      end,
    });
  }
  return days;
}

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function fmtDuration(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
