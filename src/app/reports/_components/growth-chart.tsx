"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { whoCurve } from "@/lib/growth-percentiles";
import { WHO_MAX_MONTH, type WhoSex } from "@/lib/who-growth";
import { axisTick } from "@/lib/chart-theme";
import { useChartAnimation } from "@/components/charts/chart-kit";
import type { GrowthMetric } from "./growth-shared";

type Point = { x: number; value: number };

/**
 * WHO percentile bands tinted with the baby's accent (P3–P97 outer, P15–P85
 * inner, dashed median) with the baby's own line drawing in on top.
 */
export function GrowthChart({
  metric,
  sex,
  unit,
  points,
}: {
  metric: GrowthMetric;
  sex: WhoSex;
  unit: string;
  points: Point[];
}) {
  const { ref, inView, anim } = useChartAnimation();

  const { data, ticks, maxMonth } = useMemo(() => {
    const maxAge = points.reduce((m, p) => Math.max(m, p.x), 0);
    const max = Math.min(WHO_MAX_MONTH, Math.max(6, Math.ceil(maxAge + 1)));
    const curve = whoCurve(metric, sex, max).map((c) => ({
      x: c.x,
      outer: [c.p3, c.p97] as [number, number],
      inner: [c.p15, c.p85] as [number, number],
      p50: c.p50,
    }));
    // One dataset on a numeric x-axis: curve rows + measurement rows.
    const merged: Array<Record<string, unknown> & { x: number }> = [
      ...curve,
      ...points.filter((p) => p.x <= max).map((p) => ({ x: p.x, value: p.value })),
    ].sort((a, b) => a.x - b.x);
    const t: number[] = [];
    const stepT = max > 12 ? 3 : max > 6 ? 2 : 1;
    for (let m = 0; m <= max; m += stepT) t.push(m);
    return { data: merged, ticks: t, maxMonth: max };
  }, [metric, sex, points]);

  const last = points[points.length - 1];

  return (
    <div ref={ref} className="h-[240px]">
      {inView ? (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -12, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, maxMonth]}
              ticks={ticks}
              tick={axisTick}
              tickFormatter={(m) => `${m}mo`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={42}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              cursor={{ stroke: "var(--accent-baby)", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { value?: number; p50?: number };
                return (
                  <div className="rounded-2xl bg-popover px-3 py-2 text-xs shadow-pop ring-1 ring-border/70">
                    <p className="font-bold">{Number(label).toFixed(1)} months</p>
                    {row.value != null ? (
                      <p className="nums">
                        Measured <b>{row.value} {unit}</b>
                      </p>
                    ) : row.p50 != null ? (
                      <p className="text-muted-foreground nums">
                        WHO median {row.p50} {unit}
                      </p>
                    ) : null}
                  </div>
                );
              }}
            />
            <Area
              dataKey="outer"
              stroke="none"
              fill="var(--accent-baby)"
              fillOpacity={0.12}
              connectNulls
              isAnimationActive={false}
              activeDot={false}
            />
            <Area
              dataKey="inner"
              stroke="none"
              fill="var(--accent-baby)"
              fillOpacity={0.2}
              connectNulls
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              dataKey="p50"
              stroke="var(--accent-baby-strong)"
              strokeOpacity={0.55}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--accent-baby-strong)"
              strokeWidth={3}
              connectNulls
              dot={(props: { cx?: number; cy?: number; payload?: { x: number; value?: number }; index?: number }) => {
                const { cx, cy, payload } = props;
                if (cx == null || cy == null || payload?.value == null) return <g key={props.index} />;
                const isLast = last && payload.x === last.x;
                return (
                  <g key={props.index}>
                    {isLast ? (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        fill="var(--accent-baby)"
                        opacity={0.35}
                        className="animate-halo fill-box"
                      />
                    ) : null}
                    <circle cx={cx} cy={cy} r={isLast ? 5.5 : 4} fill="var(--card)" stroke="var(--accent-baby-strong)" strokeWidth={2.5} />
                  </g>
                );
              }}
              activeDot={{ r: 6, fill: "var(--accent-baby-strong)", stroke: "var(--card)", strokeWidth: 2 }}
              {...anim}
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
