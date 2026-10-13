"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Droplets, Moon, Pill, Sparkles, Utensils, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RawEvent,
  dayBuckets,
  feedHourHistogram,
  formatDuration,
  rangeStats,
  vitaminDAdherence,
} from "@/lib/baby-stats";
import { buildInsights } from "@/lib/insights";
import { BAR_RADIUS, BAR_RADIUS_TOP, DIAPER_COLORS, axisTick, chartCursor, hourTick } from "@/lib/chart-theme";
import { medianFeedIntervalMin } from "@/lib/care-schedule";
import { KIND_META, type EventKind } from "@/lib/kind-meta";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ChartGradients, ChartTooltip, Legend, useChartAnimation } from "@/components/charts/chart-kit";
import { EmptyState } from "@/components/mascot/empty-state";
import { BabyMascot } from "@/components/mascot/baby-mascot";
import { StaggerList } from "@/components/motion/stagger";
import { WeeklySummaryCard } from "./weekly-summary-card";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
] as const;

export function ReportsDashboard({ events }: { events: RawEvent[] }) {
  const [range, setRange] = useState<"7" | "14" | "30">("7");
  const days = Number(range);

  const buckets = useMemo(() => dayBuckets(events, days), [events, days]);
  const stats = useMemo(() => rangeStats(buckets), [buckets]);
  const feedHours = useMemo(
    () => feedHourHistogram(events, days).map((count, hour) => ({ hour, count })),
    [events, days],
  );
  const feedIntervalMin = useMemo(
    () => medianFeedIntervalMin(events.filter((e) => e.kind === "feed")),
    [events],
  );
  const diaperAvg = useMemo(() => {
    const d = buckets.length || 1;
    // Untyped + both count toward wet (matches newborn-health tallying); both +
    // poop count toward dirty.
    const wet = buckets.reduce((s, b) => s + b.pee + b.both + b.untyped, 0) / d;
    const dirty = buckets.reduce((s, b) => s + b.poop + b.both, 0) / d;
    return { wet, dirty };
  }, [buckets]);
  const vitaminD = useMemo(() => vitaminDAdherence(buckets), [buckets]);
  const insights = useMemo(() => buildInsights(events), [events]);

  const hasData = stats.totalFeeds > 0 || stats.totalDiapers > 0 || buckets.some((b) => b.sleepSessions > 0);
  const tickInterval = days > 14 ? 4 : days > 7 ? 1 : 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No patterns yet"
        body="Log a few feeds, diapers and sleeps and your baby's rhythms will show up here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <SegmentedControl label="Range" value={range} onChange={setRange} options={RANGES} />

      <StaggerList className="space-y-5" gap={0.06}>
        <WeeklySummaryCard events={events} />

        <MetricCard
          kind="sleep"
          icon={Moon}
          title="Sleep per day"
          value={<AnimatedNumber value={stats.avgSleepHours} decimals={1} />}
          unit="h"
          sub={`avg a day · longest stretch ${formatDuration(stats.longestSleepMin)}`}
        >
          {(anim) => (
            <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <ChartGradients />
              <XAxis dataKey="label" tick={axisTick} interval={tickInterval} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} unit="h" />
              <Tooltip cursor={chartCursor} content={<ChartTooltip format={(v) => `${Number(v).toFixed(1)}h`} />} />
              <Bar dataKey="sleepHours" name="Sleep" fill="url(#g-sleep)" radius={BAR_RADIUS} maxBarSize={26} {...anim} />
            </BarChart>
          )}
        </MetricCard>

        <MetricCard
          kind="diaper"
          icon={Droplets}
          title="Diapers per day"
          value={<AnimatedNumber value={stats.avgDiapers} decimals={1} />}
          unit="/day"
          sub={`${stats.totalDiapers} total · ~${diaperAvg.wet.toFixed(1)} wet / ${diaperAvg.dirty.toFixed(1)} dirty a day`}
          footer={
            <Legend
              items={[
                ["Pee", DIAPER_COLORS.pee],
                ["Poop", DIAPER_COLORS.poop],
                ["Both", DIAPER_COLORS.both],
                ["Untyped", DIAPER_COLORS.untyped],
              ]}
            />
          }
        >
          {(anim) => (
            <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <XAxis dataKey="label" tick={axisTick} interval={tickInterval} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <Tooltip cursor={chartCursor} content={<ChartTooltip />} />
              <Bar dataKey="pee" stackId="d" fill={DIAPER_COLORS.pee} name="Pee" maxBarSize={26} {...anim} />
              <Bar dataKey="poop" stackId="d" fill={DIAPER_COLORS.poop} name="Poop" maxBarSize={26} {...anim} />
              <Bar dataKey="both" stackId="d" fill={DIAPER_COLORS.both} name="Both" maxBarSize={26} {...anim} />
              <Bar
                dataKey="untyped"
                stackId="d"
                fill={DIAPER_COLORS.untyped}
                name="Untyped"
                radius={BAR_RADIUS_TOP}
                maxBarSize={26}
                {...anim}
              />
            </BarChart>
          )}
        </MetricCard>

        <MetricCard
          kind="feed"
          icon={Utensils}
          title="Feeds per day"
          value={<AnimatedNumber value={stats.avgFeeds} decimals={1} />}
          unit="/day"
          sub={[
            `${stats.totalFeeds} total`,
            feedIntervalMin != null ? `~${formatDuration(feedIntervalMin)} between` : null,
            stats.totalFeedOz > 0 ? `${stats.avgFeedOz.toFixed(1)} oz/day bottle` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          footer={<FeedClock data={feedHours} />}
        >
          {(anim) => (
            <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <ChartGradients />
              <XAxis dataKey="label" tick={axisTick} interval={tickInterval} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <Tooltip cursor={chartCursor} content={<ChartTooltip />} />
              <Bar dataKey="feeds" name="Feeds" fill="url(#g-feed)" radius={BAR_RADIUS} maxBarSize={26} {...anim} />
            </BarChart>
          )}
        </MetricCard>

        {vitaminD.daysGiven > 0 ? (
          <MetricCard
            kind="med"
            icon={Pill}
            title="Vitamin D"
            value={<AnimatedNumber value={vitaminD.daysGiven} />}
            unit={`/${vitaminD.days} days`}
            sub={vitaminD.streak > 1 ? `${vitaminD.streak}-day streak · 400 IU daily` : "400 IU daily"}
            height={110}
          >
            {(anim) => (
              <BarChart data={buckets} margin={{ left: -20, right: 4, top: 4 }}>
                <ChartGradients />
                <XAxis dataKey="label" tick={axisTick} interval={tickInterval} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 1]} />
                <Tooltip
                  cursor={chartCursor}
                  content={<ChartTooltip format={(v) => (Number(v) > 0 ? "Given" : "Missed")} />}
                />
                <Bar dataKey="vitaminD" name="Vitamin D" fill="url(#g-med)" radius={BAR_RADIUS} maxBarSize={26} {...anim} />
              </BarChart>
            )}
          </MetricCard>
        ) : null}

        {insights.length > 0 ? (
          <section className="relative overflow-hidden rounded-card bg-accent-baby-soft p-5 shadow-soft">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-baby-strong" />
              <h3 className="font-display text-lg font-semibold">What we noticed</h3>
            </div>
            <ul className="space-y-2.5 pr-16">
              {insights.map((ins) => (
                <li key={ins.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      ins.tone === "good" ? "bg-kind-tummy" : "bg-accent-baby-strong",
                    )}
                  />
                  {ins.text}
                </li>
              ))}
            </ul>
            <BabyMascot mood="happy" size={72} className="absolute -bottom-2 right-2" />
          </section>
        ) : null}
      </StaggerList>
    </div>
  );
}

type Anim = ReturnType<typeof useChartAnimation>["anim"];

function MetricCard({
  kind,
  icon: Icon,
  title,
  value,
  unit,
  sub,
  footer,
  height = 170,
  children,
}: {
  kind: EventKind;
  icon: LucideIcon;
  title: string;
  value: ReactNode;
  unit: string;
  sub: string;
  footer?: ReactNode;
  height?: number;
  children: (anim: Anim) => React.ReactElement;
}) {
  const tone = KIND_META[kind].tone;
  const { ref, inView, anim } = useChartAnimation();
  return (
    <section className="rounded-card border border-border/60 bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-start gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tone.bgSoft, tone.strong)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="font-display text-3xl font-semibold leading-tight">
            {value}
            <span className="ml-0.5 text-base text-muted-foreground">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div ref={ref} style={{ height }}>
        {inView ? (
          <ResponsiveContainer width="100%" height="100%">
            {children(anim)}
          </ResponsiveContainer>
        ) : null}
      </div>
      {footer}
    </section>
  );
}

/** Feeds by hour of day; night hours tinted with the sleep colour. */
function FeedClock({ data }: { data: { hour: number; count: number }[] }) {
  const { ref, inView, anim } = useChartAnimation();
  return (
    <div className="mt-4">
      <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Time of day</p>
      <div ref={ref} className="h-[90px]">
        {inView ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20, right: 4, top: 4 }}>
              <XAxis dataKey="hour" tick={axisTick} ticks={[0, 6, 12, 18]} tickFormatter={hourTick} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip cursor={chartCursor} content={<ChartTooltip />} labelFormatter={(h) => hourTick(Number(h))} />
              <Bar dataKey="count" name="Feeds" radius={BAR_RADIUS} {...anim}>
                {data.map((d) => (
                  <Cell key={d.hour} fill={d.hour >= 7 && d.hour < 19 ? "var(--kind-feed)" : "var(--kind-sleep)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <Legend
        items={[
          ["Day (7a–7p)", "var(--kind-feed)"],
          ["Night", "var(--kind-sleep)"],
        ]}
      />
    </div>
  );
}
