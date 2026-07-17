"use client";

import { useTransition } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { chartTooltipStyle as tooltipStyle } from "@/lib/chart-theme";
import { deleteMoodCheckin } from "../actions";

export type MoodEntry = {
  id: number;
  takenOn: string;
  score: number;
  selfHarm: number;
};

const MOOD_COLOR = "var(--mood)";

function fmt(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function MoodHistory({ history }: { history: MoodEntry[] }) {
  const [pending, startTransition] = useTransition();

  if (history.length === 0) return null;

  // Oldest → newest for the trend line.
  const series = [...history]
    .reverse()
    .map((h) => ({ label: fmt(h.takenOn), score: h.score }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
          Your check-ins
        </CardTitle>
      </CardHeader>
      <CardContent>
        {series.length >= 2 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={series} margin={{ left: -20, right: 8, top: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 30]}
                ticks={[0, 10, 20, 30]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              {/* Common EPDS threshold for likely depression. */}
              <ReferenceLine
                y={13}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [v, "Score"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={MOOD_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: MOOD_COLOR }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}

        <ul className="mt-3 divide-y divide-border">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="font-display nums text-lg font-bold tabular-nums w-8">
                  {h.score}
                </span>
                <span className="text-sm text-muted-foreground">
                  {fmt(h.takenOn)}
                </span>
                {h.selfHarm > 0 ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    Follow up
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteMoodCheckin(h.id);
                  })
                }
                className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                aria-label="Delete check-in"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
