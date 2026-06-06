"use client";

import { useMemo } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type RawEvent,
  dayBuckets,
  formatDuration,
  rangeStats,
} from "@/lib/baby-stats";

/** "This week vs last week" headline rollup. Always a trailing 7/7 split. */
export function WeeklySummaryCard({ events }: { events: RawEvent[] }) {
  const { last, prev } = useMemo(() => {
    const b14 = dayBuckets(events, 14);
    return { last: rangeStats(b14.slice(7)), prev: rangeStats(b14.slice(0, 7)) };
  }, [events]);

  const metrics = [
    {
      label: "Avg sleep / day",
      value: `${last.avgSleepHours.toFixed(1)}h`,
      delta: last.avgSleepHours - prev.avgSleepHours,
      fmt: (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(1)}h`,
      higherIsBetter: true,
    },
    {
      label: "Feeds / day",
      value: last.avgFeeds.toFixed(1),
      delta: last.avgFeeds - prev.avgFeeds,
      fmt: (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(1)}`,
      higherIsBetter: null,
    },
    {
      label: "Diapers / day",
      value: last.avgDiapers.toFixed(1),
      delta: last.avgDiapers - prev.avgDiapers,
      fmt: (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(1)}`,
      higherIsBetter: null,
    },
    {
      label: "Longest stretch",
      value: formatDuration(last.longestSleepMin),
      delta: last.longestSleepMin - prev.longestSleepMin,
      fmt: (d: number) =>
        `${d > 0 ? "+" : "-"}${formatDuration(Math.abs(d))}`,
      higherIsBetter: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">
              {m.value}
            </p>
            <Delta
              delta={m.delta}
              text={m.fmt(m.delta)}
              higherIsBetter={m.higherIsBetter}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Delta({
  delta,
  text,
  higherIsBetter,
}: {
  delta: number;
  text: string;
  higherIsBetter: boolean | null;
}) {
  const flat = Math.abs(delta) < 0.05;
  const good =
    higherIsBetter == null ? null : higherIsBetter ? delta > 0 : delta < 0;
  const color = flat
    ? "text-muted-foreground"
    : good == null
      ? "text-muted-foreground"
      : good
        ? "text-hospital"
        : "text-destructive";
  const Icon = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {flat ? "no change" : `${text} vs last wk`}
    </span>
  );
}
