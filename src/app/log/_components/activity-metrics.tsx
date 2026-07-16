"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayBuckets, formatDuration, rangeStats } from "@/lib/baby-stats";
import type { RawEvent } from "@/lib/baby-stats";
import {
  DIAPER_COLORS,
  FEED_COLOR,
  chartTooltipStyle,
} from "@/lib/chart-theme";
import {
  defaultFeedIntervalMin,
  feedDueStatus,
  medianFeedIntervalMin,
} from "@/lib/care-schedule";
import { ageInDays, diaperGuidance, tallyDiapers } from "@/lib/newborn-health";
import type { BabyEventRow } from "./timeline";

/**
 * Richer header for the /log/feed and /log/diaper detail pages: a headline
 * (next-feed prediction / diaper adequacy), a stat row, and a 7-day chart.
 * Time-relative bits are gated behind a mounted clock so SSR and the client
 * agree (see `now`). Charts reuse the shared chart-theme palette.
 */
export function ActivityMetrics({
  kind,
  rows,
  birthDate,
}: {
  kind: "feed" | "diaper";
  rows: BabyEventRow[];
  birthDate: string | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reserve height pre-mount to avoid layout shift.
  if (!now) return <div className="mb-6 h-[236px]" />;

  return kind === "feed" ? (
    <FeedMetrics rows={rows} birthDate={birthDate} now={now} />
  ) : (
    <DiaperMetrics rows={rows} birthDate={birthDate} now={now} />
  );
}

function FeedMetrics({
  rows,
  birthDate,
  now,
}: {
  rows: BabyEventRow[];
  birthDate: string | null;
  now: Date;
}) {
  const buckets = dayBuckets(rows as unknown as RawEvent[], 7, now);
  const today = buckets[buckets.length - 1];
  const stats = rangeStats(buckets);
  const intervalMin =
    medianFeedIntervalMin(rows) ?? defaultFeedIntervalMin(ageInDays(birthDate, now));
  const last = rows[0]?.occurred_at ?? null;
  const status = last ? feedDueStatus(last, intervalMin, now) : null;

  return (
    <div className="mb-6 space-y-3">
      {status ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3",
            status.overdueMin >= 0
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-border bg-card",
          )}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-amber-500 shrink-0">
            <Clock className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">
              {status.overdueMin >= 0 ? "Feed due" : "Next feed"}{" "}
              <span className="font-display nums font-bold">{status.label}</span>
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              typical gap {formatDuration(intervalMin)} · around{" "}
              {status.dueAt.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Today" value={String(today.feeds)} />
        <StatTile label="7-day avg" value={`${round1(stats.avgFeeds)}/d`} />
        <StatTile
          label={stats.totalFeedOz > 0 ? "Oz · 7 days" : "Gap"}
          value={
            stats.totalFeedOz > 0
              ? round1(stats.totalFeedOz)
              : formatDuration(intervalMin)
          }
        />
      </div>

      <ChartCard title="Feeds per day">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={buckets} margin={{ left: -24, right: 4, top: 4 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(v) => [v, "Feeds"]}
            />
            <Bar dataKey="feeds" fill={FEED_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function DiaperMetrics({
  rows,
  birthDate,
  now,
}: {
  rows: BabyEventRow[];
  birthDate: string | null;
  now: Date;
}) {
  const buckets = dayBuckets(rows as unknown as RawEvent[], 7, now);
  const today = buckets[buckets.length - 1];
  const stats = rangeStats(buckets);

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todays = rows.filter((r) => new Date(r.occurred_at) >= startOfDay);
  const g = diaperGuidance(tallyDiapers(todays), birthDate, now);

  return (
    <div className="mb-6 space-y-3">
      <div
        className={cn(
          "rounded-2xl border px-4 py-3",
          g.status === "good"
            ? "border-hospital/40 bg-hospital-soft/40"
            : "border-border bg-card",
        )}
      >
        <p className="mb-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Today vs target
        </p>
        <div className="grid grid-cols-2 gap-3">
          <TargetStat label="Wet" value={g.wet} target={g.targetWet} met={g.wetMet} />
          <TargetStat
            label="Dirty"
            value={g.dirty}
            target={g.targetDirty}
            met={g.dirtyMet}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{g.note}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Today" value={String(today.diapers)} />
        <StatTile label="7-day avg" value={`${round1(stats.avgDiapers)}/d`} />
        <StatTile label="Total · 7d" value={String(stats.totalDiapers)} />
      </div>

      <ChartCard title="Diapers per day">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={buckets} margin={{ left: -24, right: 4, top: 4 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            />
            <Bar dataKey="pee" stackId="d" fill={DIAPER_COLORS.pee} name="Pee" />
            <Bar dataKey="poop" stackId="d" fill={DIAPER_COLORS.poop} name="Poop" />
            <Bar dataKey="both" stackId="d" fill={DIAPER_COLORS.both} name="Both" />
            <Bar
              dataKey="untyped"
              stackId="d"
              fill={DIAPER_COLORS.untyped}
              name="Untyped"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {(
            [
              ["Pee", DIAPER_COLORS.pee],
              ["Poop", DIAPER_COLORS.poop],
              ["Both", DIAPER_COLORS.both],
              ["Untyped", DIAPER_COLORS.untyped],
            ] as [string, string][]
          ).map(([label, color]) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-3 py-3">
      <p className="font-display nums text-2xl leading-none font-bold tracking-tight">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function TargetStat({
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

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="mb-1 px-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
