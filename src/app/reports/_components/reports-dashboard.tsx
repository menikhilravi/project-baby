"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Droplets, Moon, Sparkles, Utensils } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type RawEvent,
  dayBuckets,
  feedHourHistogram,
  formatDuration,
  rangeStats,
} from "@/lib/baby-stats";
import { buildInsights } from "@/lib/insights";
import { WeeklySummaryCard } from "./weekly-summary-card";

const RANGES = [7, 14, 30] as const;

const DIAPER_COLORS = {
  pee: "oklch(0.82 0.13 95)",
  poop: "oklch(0.52 0.08 60)",
  both: "oklch(0.64 0.11 45)",
  untyped: "var(--muted-foreground)",
} as const;

const SLEEP_COLOR = "var(--reports)";
const FEED_COLOR = "oklch(0.76 0.15 70)";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

export function ReportsDashboard({ events }: { events: RawEvent[] }) {
  const [days, setDays] = useState<number>(7);

  const buckets = useMemo(() => dayBuckets(events, days), [events, days]);
  const stats = useMemo(() => rangeStats(buckets), [buckets]);
  const feedHours = useMemo(
    () => feedHourHistogram(events, days),
    [events, days],
  );
  const insights = useMemo(() => buildInsights(events), [events]);

  const hasData =
    stats.totalFeeds > 0 ||
    stats.totalDiapers > 0 ||
    buckets.some((b) => b.sleepSessions > 0);

  const tickInterval = days > 14 ? 4 : days > 7 ? 1 : 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No data yet — log a few feeds, diapers, and sleeps and your patterns
          will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={days}
        onValueChange={(v) => setDays(v as number)}
        className="items-center"
      >
        <TabsList>
          {RANGES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {r} days
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <WeeklySummaryCard events={events} />

      {/* Sleep */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
            <Moon className="h-3.5 w-3.5 text-indigo-400" /> Sleep per day
          </CardTitle>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display nums text-3xl font-bold tracking-tight">
              {stats.avgSleepHours.toFixed(1)}
              <span className="text-lg text-muted-foreground font-semibold">h</span>
            </span>
            <span className="text-xs text-muted-foreground">
              avg/day · longest {formatDuration(stats.longestSleepMin)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                interval={tickInterval}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={36}
                unit="h"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                formatter={(v) => [`${Number(v).toFixed(1)}h`, "Sleep"]}
              />
              <Bar dataKey="sleepHours" fill={SLEEP_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Diapers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
            <Droplets className="h-3.5 w-3.5 text-sky-500" /> Diapers per day
          </CardTitle>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display nums text-3xl font-bold tracking-tight">
              {stats.avgDiapers.toFixed(1)}
              <span className="text-lg text-muted-foreground font-semibold">
                /day
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {stats.totalDiapers} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                interval={tickInterval}
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
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              />
              <Bar dataKey="pee" stackId="d" fill={DIAPER_COLORS.pee} name="Pee" />
              <Bar
                dataKey="poop"
                stackId="d"
                fill={DIAPER_COLORS.poop}
                name="Poop"
              />
              <Bar
                dataKey="both"
                stackId="d"
                fill={DIAPER_COLORS.both}
                name="Both"
              />
              <Bar
                dataKey="untyped"
                stackId="d"
                fill={DIAPER_COLORS.untyped}
                name="Untyped"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <Legend
            items={[
              ["Pee", DIAPER_COLORS.pee],
              ["Poop", DIAPER_COLORS.poop],
              ["Both", DIAPER_COLORS.both],
              ["Untyped", DIAPER_COLORS.untyped],
            ]}
          />
        </CardContent>
      </Card>

      {/* Feeds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
            <Utensils className="h-3.5 w-3.5 text-amber-500" /> Feeds per day
          </CardTitle>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display nums text-3xl font-bold tracking-tight">
              {stats.avgFeeds.toFixed(1)}
              <span className="text-lg text-muted-foreground font-semibold">
                /day
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {stats.totalFeeds} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                interval={tickInterval}
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
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                formatter={(v) => [v, "Feeds"]}
              />
              <Bar dataKey="feeds" fill={FEED_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <p className="mt-4 mb-1 text-xs font-medium text-muted-foreground">
            Time of day
          </p>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart
              data={feedHours.map((count, hour) => ({ hour, count }))}
              margin={{ left: -20, right: 4, top: 4 }}
            >
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                ticks={[0, 6, 12, 18]}
                tickFormatter={hourTick}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                formatter={(v) => [v, "Feeds"]}
                labelFormatter={(h) => hourTick(Number(h))}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {feedHours.map((_, hour) => (
                  <Cell
                    key={hour}
                    fill={hour >= 7 && hour < 19 ? FEED_COLOR : "var(--logger)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-reports" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="flex items-start gap-2 text-sm text-foreground/90"
              >
                <span
                  className={
                    ins.tone === "good"
                      ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hospital"
                      : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-reports"
                  }
                />
                {ins.text}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {items.map(([label, color]) => (
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
  );
}

function hourTick(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}
