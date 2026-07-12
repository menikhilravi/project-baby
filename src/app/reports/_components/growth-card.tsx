"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WHO_MAX_MONTH, type WhoSex } from "@/lib/who-growth";
import { ordinal, valueToCentile, whoCurve } from "@/lib/growth-percentiles";
import { addMeasurement, removeMeasurement, setBabySex } from "../growth-actions";

export type GrowthRow = {
  id: number;
  measured_on: string;
  weight_g: number | null;
  height_cm: number | null;
  head_cm: number | null;
};

type Metric = "weight" | "height" | "head";

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "height", label: "Height", unit: "cm" },
  { key: "head", label: "Head", unit: "cm" },
];

const MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function metricValue(row: GrowthRow, m: Metric): number | null {
  if (m === "weight") return row.weight_g == null ? null : row.weight_g / 1000;
  if (m === "height") return row.height_cm;
  return row.head_cm;
}

function ageInMonths(birthDate: string, measuredOn: string): number {
  const ms =
    new Date(`${measuredOn}T00:00:00`).getTime() -
    new Date(`${birthDate}T00:00:00`).getTime();
  return ms / MS_PER_MONTH;
}

export function GrowthCard({
  measurements,
  birthDate,
  initialSex,
}: {
  measurements: GrowthRow[];
  birthDate: string | null;
  initialSex: WhoSex | null;
}) {
  const [metric, setMetric] = useState<Metric>("weight");
  const [showForm, setShowForm] = useState(false);
  const [sex, setSex] = useState<WhoSex>(initialSex ?? "male");
  const [, startTransition] = useTransition();

  const setSexPersist = (s: WhoSex) => {
    setSex(s);
    startTransition(async () => {
      try {
        await setBabySex(s);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const meta = METRICS.find((m) => m.key === metric)!;

  // Actual measurements that have a value for this metric, oldest → newest.
  const points = useMemo(
    () =>
      measurements
        .map((r) => ({ row: r, value: metricValue(r, metric) }))
        .filter((p): p is { row: GrowthRow; value: number } => p.value != null)
        .map((p) => ({
          age: birthDate ? ageInMonths(birthDate, p.row.measured_on) : null,
          date: p.row.measured_on,
          value: p.value,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [measurements, metric, birthDate],
  );

  const hasWho = Boolean(birthDate);

  const { data, ticks, maxMonth } = useMemo(() => {
    if (!hasWho) return { data: [], ticks: [], maxMonth: 0 };
    const maxAge = points.reduce((m, p) => Math.max(m, p.age ?? 0), 0);
    const max = Math.min(WHO_MAX_MONTH, Math.max(6, Math.ceil(maxAge + 1)));
    const curve = whoCurve(metric, sex, max);
    const merged = [
      ...curve.map((c) => ({ ...c })),
      ...points
        .filter((p) => p.age != null && p.age <= max)
        .map((p) => ({ x: p.age as number, value: p.value })),
    ].sort((a, b) => a.x - b.x);
    const t: number[] = [];
    for (let m = 0; m <= max; m += 3) t.push(m);
    return { data: merged, ticks: t, maxMonth: max };
  }, [hasWho, points, metric, sex]);

  // Latest measurement's percentile, for the caption.
  const latest = points[points.length - 1];
  const centile =
    hasWho && latest && latest.age != null
      ? valueToCentile(metric, sex, latest.age, latest.value)
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Growth</CardTitle>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "outline"}
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? <AddForm onDone={() => setShowForm(false)} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList>
              {METRICS.map((m) => (
                <TabsTrigger key={m.key} value={m.key}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {hasWho ? (
            <Tabs value={sex} onValueChange={(v) => setSexPersist(v as WhoSex)}>
              <TabsList>
                <TabsTrigger value="male">Boy</TabsTrigger>
                <TabsTrigger value="female">Girl</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {!hasWho && points.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No {meta.label.toLowerCase()} entries yet. Tap Add to record one.
          </p>
        ) : hasWho ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={data}
                margin={{ left: -16, right: 8, top: 8, bottom: 4 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, maxMonth]}
                  ticks={ticks}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(m) => `${m}mo`}
                  tickLine={false}
                  axisLine={false}
                  allowDuplicatedCategory={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  domain={["auto", "auto"]}
                  unit={meta.unit}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [`${v} ${meta.unit}`, labelFor(name)]}
                  labelFormatter={(m) => `${Number(m).toFixed(1)} mo`}
                />
                {/* WHO percentile band */}
                <Curve dataKey="p3" opacity={0.3} />
                <Curve dataKey="p15" opacity={0.2} />
                <Curve dataKey="p50" opacity={0.55} dash />
                <Curve dataKey="p85" opacity={0.2} />
                <Curve dataKey="p97" opacity={0.3} />
                {/* Actual measurements */}
                <Line
                  type="monotone"
                  dataKey="value"
                  name="value"
                  stroke="var(--reports)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--reports)" }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground">
              {centile != null && latest ? (
                <>
                  Latest {meta.label.toLowerCase()}:{" "}
                  <span className="font-medium text-foreground">
                    {latest.value} {meta.unit}
                  </span>{" "}
                  · around the{" "}
                  <span className="font-medium text-foreground">
                    {ordinal(clampCentile(centile))} percentile
                  </span>{" "}
                  for a {sex === "male" ? "boy" : "girl"}. Lines are WHO 3/15/50/85/97th.
                </>
              ) : (
                <>Lines show WHO 3/15/50/85/97th percentiles. Add a measurement to plot it.</>
              )}
            </p>
          </>
        ) : (
          <DateChart points={points} unit={meta.unit} label={meta.label} />
        )}

        {measurements.length > 0 ? (
          <EntryList measurements={measurements} metric={metric} unit={meta.unit} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function Curve({
  dataKey,
  opacity,
  dash,
}: {
  dataKey: string;
  opacity: number;
  dash?: boolean;
}) {
  return (
    <Line
      type="monotone"
      dataKey={dataKey}
      stroke="var(--muted-foreground)"
      strokeOpacity={opacity}
      strokeWidth={1}
      strokeDasharray={dash ? "5 4" : undefined}
      dot={false}
      activeDot={false}
      connectNulls
      isAnimationActive={false}
    />
  );
}

function labelFor(name: unknown): string {
  const map: Record<string, string> = {
    value: "Measured",
    p3: "3rd",
    p15: "15th",
    p50: "50th",
    p85: "85th",
    p97: "97th",
  };
  return map[String(name)] ?? String(name);
}

function clampCentile(c: number): number {
  return Math.min(99, Math.max(1, c));
}

/** Fallback: plot vs measurement date when we don't know the birth date. */
function DateChart({
  points,
  unit,
  label,
}: {
  points: { date: string; value: number }[];
  unit: string;
  label: string;
}) {
  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No {label.toLowerCase()} entries yet. Tap Add to record one.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={points}
        margin={{ left: -16, right: 8, top: 8, bottom: 4 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={["auto", "auto"]}
          unit={unit}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`${v} ${unit}`, label]}
          labelFormatter={(d) => shortDate(String(d))}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--reports)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--reports)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [head, setHead] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    const w = weight.trim() ? Number(weight) : null;
    const h = height.trim() ? Number(height) : null;
    const hc = head.trim() ? Number(head) : null;
    if (w == null && h == null && hc == null) {
      setError("Enter at least one value.");
      return;
    }
    startTransition(async () => {
      try {
        await addMeasurement({
          measured_on: date,
          weight_g: w == null ? null : Math.round(w * 1000),
          height_cm: h,
          head_cm: hc,
        });
        setWeight("");
        setHeight("");
        setHead("");
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Weight (kg)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="4.2"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Field label="Height (cm)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="55"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Field>
        <Field label="Head (cm)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="38"
            value={head}
            onChange={(e) => setHead(e.target.value)}
          />
        </Field>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function EntryList({
  measurements,
  metric,
  unit,
}: {
  measurements: GrowthRow[];
  metric: Metric;
  unit: string;
}) {
  const [pending, startTransition] = useTransition();
  const rows = [...measurements]
    .sort((a, b) => b.measured_on.localeCompare(a.measured_on))
    .slice(0, 5);

  const remove = (id: number) => {
    startTransition(async () => {
      try {
        await removeMeasurement(id);
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <ul className="divide-y divide-border border-t border-border mt-3">
      {rows.map((r) => {
        const v = metricValue(r, metric);
        return (
          <li
            key={r.id}
            className="group flex items-center gap-2 text-sm tabular-nums py-2.5"
          >
            <span className="text-muted-foreground">
              {shortDate(r.measured_on)}
            </span>
            <span className="font-medium">
              {v == null ? "—" : `${v} ${unit}`}
            </span>
            <button
              type="button"
              onClick={() => remove(r.id)}
              disabled={pending}
              className="ml-auto text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label="Delete measurement"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
