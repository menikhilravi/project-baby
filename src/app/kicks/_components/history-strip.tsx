"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type KickSession = {
  session_start: string;
  session_end: string;
  kick_count: number;
  reached_ten_at: string | null;
};

type DayBucket = {
  date: string;
  label: string;
  totalKicks: number;
  bestTimeToTenMs: number | null;
};

export function HistoryStrip({ sessions }: { sessions: KickSession[] }) {
  // Bucket in user local time. Defer "now" until the client renders so SSR
  // (UTC) doesn't skew which day a kick lands in (the bug where Thursday
  // kicks showed up under Friday in west-of-UTC timezones).
  const [now] = useState<Date | null>(() =>
    typeof window === "undefined" ? null : new Date(),
  );
  if (!now) {
    // SSR placeholder — same shape, neutral content. Hydrates immediately.
    return (
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight">Last 7 days</h2>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/50 px-3 py-4">
          <div className="grid grid-cols-7 gap-2 items-end h-32" />
        </div>
      </section>
    );
  }
  const days = buildLastSevenDays(sessions, now);
  const maxKicks = Math.max(1, ...days.map((d) => d.totalKicks));
  const totalSessions = sessions.length;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Last 7 days</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/50 px-3 py-4">
        <div className="grid grid-cols-7 gap-2 items-end h-32">
          {days.map((d) => {
            const h = d.totalKicks === 0 ? 0 : (d.totalKicks / maxKicks) * 100;
            const reachedTen = d.bestTimeToTenMs !== null;
            return (
              <div
                key={d.date}
                className="flex flex-col items-center justify-end gap-1.5 h-full"
                title={tooltip(d)}
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {d.totalKicks || ""}
                </span>
                <div
                  className={cn(
                    "w-full rounded-md transition-all",
                    d.totalKicks === 0
                      ? "bg-border/40 h-1"
                      : reachedTen
                        ? "bg-kicks"
                        : "bg-kicks/50",
                  )}
                  style={
                    d.totalKicks === 0
                      ? undefined
                      : { height: `${Math.max(8, h)}%` }
                  }
                />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function buildLastSevenDays(sessions: KickSession[], now: Date): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dateKey(d);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      totalKicks: 0,
      bestTimeToTenMs: null,
    });
  }
  for (const s of sessions) {
    const key = dateKey(new Date(s.session_start));
    const b = buckets.get(key);
    if (!b) continue;
    b.totalKicks += s.kick_count;
    if (s.reached_ten_at) {
      const t =
        new Date(s.reached_ten_at).getTime() -
        new Date(s.session_start).getTime();
      if (b.bestTimeToTenMs === null || t < b.bestTimeToTenMs) {
        b.bestTimeToTenMs = t;
      }
    }
  }
  return Array.from(buckets.values());
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tooltip(d: DayBucket): string {
  const parts = [d.date, `${d.totalKicks} kicks`];
  if (d.bestTimeToTenMs !== null) {
    parts.push(`best to 10: ${formatMs(d.bestTimeToTenMs)}`);
  }
  return parts.join(" · ");
}

function formatMs(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
