"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Scale } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { axisTick } from "@/lib/chart-theme";
import { ChartTooltip, useChartAnimation } from "@/components/charts/chart-kit";
import type { GrowthRow } from "./growth-shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The first-2-week concern WHO percentiles don't surface: newborns lose
 * ~7–10% of birth weight and should be back by ~day 14. Plots each weigh-in as
 * a % of birth weight, with the 100% line and the day-14 marker. Renders
 * nothing until a birth weight and birth date are set (both live in Settings).
 */
export function BirthWeightCard({
  birthWeightG,
  birthDate,
  measurements,
}: {
  birthWeightG: number | null;
  birthDate: string | null;
  measurements: GrowthRow[];
}) {
  const points = useMemo(() => {
    if (!birthWeightG || !birthDate) return [];
    const birth = new Date(`${birthDate}T00:00:00`).getTime();
    return measurements
      .filter((m) => m.weight_g != null)
      .map((m) => {
        const day = Math.round(
          (new Date(`${m.measured_on}T00:00:00`).getTime() - birth) / DAY_MS,
        );
        return { day, pct: Math.round((m.weight_g! / birthWeightG) * 1000) / 10 };
      })
      .filter((p) => p.day >= 0)
      .sort((a, b) => a.day - b.day);
  }, [birthWeightG, birthDate, measurements]);

  const { ref, inView, anim } = useChartAnimation();
  if (!birthWeightG || !birthDate || points.length === 0) return null;

  const latest = points[points.length - 1];
  const lowest = points.reduce((m, p) => Math.min(m, p.pct), Infinity);
  const regained = points.find((p) => p.pct >= 100) ?? null;

  const maxDay = Math.max(14, latest.day);
  const status: { text: string; tone: "good" | "warn" | "neutral" } = regained
    ? { text: `Back to birth weight by day ${regained.day}.`, tone: "good" }
    : latest.day > 14
      ? {
          text: `At ${latest.pct}% of birth weight on day ${latest.day} — worth checking with your pediatrician.`,
          tone: "warn",
        }
      : {
          text: `Dipped to ${lowest}%. Newborns lose ~7–10% and are usually back by day 14.`,
          tone: "neutral",
        };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-baby-soft text-accent-baby-strong">
            <Scale className="h-4 w-4" />
          </span>
          Birth-weight recovery
        </CardTitle>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-display nums text-3xl font-semibold">
            {latest.pct}
            <span className="text-lg text-muted-foreground font-semibold">%</span>
          </span>
          <span className="text-xs text-muted-foreground">
            of birth weight · born {(birthWeightG / 1000).toFixed(2)} kg
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="h-[150px]">
        {inView ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ left: -18, right: 8, top: 6, bottom: 2 }}
          >
            <XAxis
              type="number"
              dataKey="day"
              domain={[0, maxDay]}
              ticks={tickRange(maxDay)}
              tick={axisTick}
              tickFormatter={(d) => `d${d}`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={["dataMin - 2", 102]}
              unit="%"
            />
            <ReferenceLine
              y={100}
              stroke="var(--kind-tummy)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
            <ReferenceLine
              x={14}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Tooltip
              content={<ChartTooltip format={(v) => `${v}%`} />}
              labelFormatter={(d) => `Day ${d}`}
            />
            <Line
              type="monotone"
              dataKey="pct"
              name="Of birth weight"
              stroke="var(--accent-baby-strong)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--card)", stroke: "var(--accent-baby-strong)", strokeWidth: 2.5 }}
              {...anim}
            />
          </LineChart>
        </ResponsiveContainer>
        ) : null}
        </div>
        <p
          className={cn(
            "mt-2 text-xs",
            status.tone === "good"
              ? "text-kind-tummy-strong font-semibold"
              : status.tone === "warn"
                ? "text-due-strong font-semibold"
                : "text-muted-foreground",
          )}
        >
          {status.text}
        </p>
      </CardContent>
    </Card>
  );
}

function tickRange(maxDay: number): number[] {
  const step = maxDay <= 14 ? 2 : maxDay <= 30 ? 5 : 7;
  const ticks: number[] = [];
  for (let d = 0; d <= maxDay; d += step) ticks.push(d);
  return ticks;
}
