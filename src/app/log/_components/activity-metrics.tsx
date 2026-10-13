"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayBuckets, formatDuration, rangeStats } from "@/lib/baby-stats";
import type { RawEvent } from "@/lib/baby-stats";
import { BAR_RADIUS, BAR_RADIUS_TOP, DIAPER_COLORS, axisTick, chartCursor } from "@/lib/chart-theme";
import { defaultFeedIntervalMin, feedDueStatus, medianFeedIntervalMin } from "@/lib/care-schedule";
import { ageInDays, diaperGuidance, tallyDiapers } from "@/lib/newborn-health";
import { formatClockTime } from "@/lib/time-format";
import { useNow } from "@/hooks/use-now";
import { useTimeZone } from "@/components/providers/time-zone";
import { StatTile } from "@/components/ui/stat-tile";
import { ChartCard, ChartGradients, ChartTooltip, Legend, useChartAnimation } from "@/components/charts/chart-kit";
import { IntakeGauge } from "@/components/milk/intake-gauge";
import { bottleOz } from "@/lib/live-state";
import type { BabyEventRow } from "./timeline";

/**
 * Richer header for the /log/feed and /log/diaper detail pages: a headline
 * (next-feed prediction / diaper adequacy), a stat row, and a 7-day chart.
 * Clock-relative bits wait for the client clock so SSR and hydration agree.
 */
export function ActivityMetrics({
  kind,
  rows,
  birthDate,
  intakeRange,
}: {
  kind: "feed" | "diaper";
  rows: BabyEventRow[];
  birthDate: string | null;
  intakeRange?: { low: number; high: number } | null;
}) {
  const tick = useNow(60_000);
  // Reserve height pre-mount to avoid layout shift.
  if (!tick) return <div className="mb-6 h-[340px]" />;
  const now = new Date(tick);
  return kind === "feed" ? (
    <FeedMetrics rows={rows} birthDate={birthDate} now={now} intakeRange={intakeRange ?? null} />
  ) : (
    <DiaperMetrics rows={rows} birthDate={birthDate} now={now} />
  );
}

function FeedMetrics({
  rows,
  birthDate,
  now,
  intakeRange,
}: {
  rows: BabyEventRow[];
  birthDate: string | null;
  now: Date;
  intakeRange: { low: number; high: number } | null;
}) {
  const { tz } = useTimeZone();
  const dayKey = now.toDateString();
  // Memoised per day so the per-minute clock tick doesn't replay chart animations.
  const buckets = useMemo(
    () => dayBuckets(rows as unknown as RawEvent[], 7, new Date(dayKey)),
     
    [rows, dayKey],
  );
  const today = buckets[buckets.length - 1];
  const stats = rangeStats(buckets);
  const intervalMin = medianFeedIntervalMin(rows) ?? defaultFeedIntervalMin(ageInDays(birthDate, now));
  const last = rows[0]?.occurred_at ?? null;
  const status = last ? feedDueStatus(last, intervalMin, now) : null;
  const todayOz = rows
    .filter((r) => new Date(r.occurred_at).toDateString() === dayKey)
    .reduce((s, r) => s + bottleOz(r), 0);
  const { ref, inView, anim } = useChartAnimation();

  return (
    <div className="mb-6 space-y-3">
      {status ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-card px-4 py-3.5 shadow-soft",
            status.overdueMin >= 0 ? "bg-[color-mix(in_oklab,var(--due)_18%,var(--card))]" : "bg-kind-feed-soft",
          )}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card/80 text-kind-feed-strong">
            <Clock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {status.overdueMin >= 0 ? "Feed due" : "Next feed"}{" "}
              <span className="font-display text-lg nums">{status.label}</span>
            </p>
            <p className="text-xs text-muted-foreground nums">
              typical gap {formatDuration(intervalMin)} · around {formatClockTime(status.dueAt, tz)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Today" value={String(today.feeds)} />
        <StatTile label="7-day avg" value={`${round1(stats.avgFeeds)}/d`} />
        <StatTile
          label={stats.totalFeedOz > 0 ? "Oz · 7 days" : "Gap"}
          value={stats.totalFeedOz > 0 ? round1(stats.totalFeedOz) : formatDuration(intervalMin)}
        />
      </div>

      {todayOz > 0 ? <IntakeGauge oz={Math.round(todayOz * 10) / 10} range={intakeRange} /> : null}

      <ChartCard title="Feeds per day" subtitle="Last 7 days">
        <div ref={ref} className="h-[150px]">
          {inView ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ left: -24, right: 4, top: 4 }}>
                <ChartGradients />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <Tooltip cursor={chartCursor} content={<ChartTooltip />} />
                <Bar dataKey="feeds" name="Feeds" fill="url(#g-feed)" radius={BAR_RADIUS} maxBarSize={28} {...anim} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
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
  const dayKey = now.toDateString();
  const buckets = useMemo(
    () => dayBuckets(rows as unknown as RawEvent[], 7, new Date(dayKey)),
     
    [rows, dayKey],
  );
  const today = buckets[buckets.length - 1];
  const stats = rangeStats(buckets);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const todays = rows.filter((r) => new Date(r.occurred_at) >= startOfDay);
  const g = diaperGuidance(tallyDiapers(todays), birthDate, now);
  const { ref, inView, anim } = useChartAnimation();

  return (
    <div className="mb-6 space-y-3">
      <div
        className={cn(
          "rounded-card px-4 py-4 shadow-soft",
          g.status === "good" ? "bg-kind-tummy-soft" : "bg-kind-diaper-soft",
        )}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Today vs target</p>
        <div className="grid grid-cols-2 gap-3">
          <TargetStat label="Wet" value={g.wet} target={g.targetWet} met={g.wetMet} />
          <TargetStat label="Dirty" value={g.dirty} target={g.targetDirty} met={g.dirtyMet} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{g.note}</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Today" value={String(today.diapers)} />
        <StatTile label="7-day avg" value={`${round1(stats.avgDiapers)}/d`} />
        <StatTile label="Total · 7d" value={String(stats.totalDiapers)} />
      </div>

      <ChartCard title="Diapers per day" subtitle="Last 7 days">
        <div ref={ref} className="h-[150px]">
          {inView ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ left: -24, right: 4, top: 4 }}>
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <Tooltip cursor={chartCursor} content={<ChartTooltip />} />
                <Bar dataKey="pee" stackId="d" fill={DIAPER_COLORS.pee} name="Pee" maxBarSize={28} {...anim} />
                <Bar dataKey="poop" stackId="d" fill={DIAPER_COLORS.poop} name="Poop" maxBarSize={28} {...anim} />
                <Bar dataKey="both" stackId="d" fill={DIAPER_COLORS.both} name="Both" maxBarSize={28} {...anim} />
                <Bar
                  dataKey="untyped"
                  stackId="d"
                  fill={DIAPER_COLORS.untyped}
                  name="Untyped"
                  radius={BAR_RADIUS_TOP}
                  maxBarSize={28}
                  {...anim}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        <Legend
          items={[
            ["Pee", DIAPER_COLORS.pee],
            ["Poop", DIAPER_COLORS.poop],
            ["Both", DIAPER_COLORS.both],
            ["Untyped", DIAPER_COLORS.untyped],
          ]}
        />
      </ChartCard>
    </div>
  );
}

function TargetStat({ label, value, target, met }: { label: string; value: number; target: number; met: boolean }) {
  return (
    <div className="rounded-2xl bg-card/80 px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-semibold leading-tight nums">
        {value}
        <span className={cn("text-sm font-semibold", met ? "text-kind-tummy-strong" : "text-muted-foreground")}>
          {" "}
          / {target}
        </span>
      </p>
    </div>
  );
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
