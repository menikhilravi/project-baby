"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/mascot/empty-state";
import { useTheme } from "@/components/theme/theme-provider";
import { ChartTooltip, useChartAnimation } from "@/components/charts/chart-kit";
import { valueToCentile } from "@/lib/growth-percentiles";
import { axisTick } from "@/lib/chart-theme";
import { spring } from "@/lib/motion";
import { toast } from "@/lib/toast";
import type { WhoSex } from "@/lib/who-growth";
import { addMeasurement, removeMeasurement, setBabySex } from "../growth-actions";
import { GrowthChart } from "./growth-chart";
import { GrowthBadge } from "./growth-badge";
import { AddMeasurementSheet } from "./add-measurement-sheet";
import {
  GROWTH_METRICS,
  ageInMonths,
  kgToLbOz,
  metricValue,
  shortDate,
  type GrowthMetric,
  type GrowthRow,
} from "./growth-shared";

export type { GrowthRow } from "./growth-shared";

export function GrowthCard({
  measurements,
  birthDate,
  initialSex,
}: {
  measurements: GrowthRow[];
  birthDate: string | null;
  initialSex: WhoSex | null;
}) {
  const [metric, setMetric] = useState<GrowthMetric>("weight");
  const [sex, setSex] = useState<WhoSex | null>(initialSex);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const { previewAccent } = useTheme();
  // Until the sex is set, plot against the boys' curves but say so.
  const curveSex: WhoSex = sex ?? "male";

  const chooseSex = (s: WhoSex) => {
    setSex(s);
    // The accent follows the baby: repaint now, persist (layout revalidates).
    previewAccent(s === "male" ? "boy" : "girl");
    startTransition(async () => {
      try {
        await setBabySex(s);
      } catch (err) {
        toast.error("Couldn't save that", err instanceof Error ? err.message : undefined);
      }
    });
  };

  const meta = GROWTH_METRICS.find((g) => g.key === metric)!;

  const points = useMemo(
    () =>
      measurements
        .map((r) => ({ date: r.measured_on, value: metricValue(r, metric) }))
        .filter((p): p is { date: string; value: number } => p.value != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({ ...p, x: birthDate ? ageInMonths(birthDate, p.date) : 0 })),
    [measurements, metric, birthDate],
  );

  const latest = points[points.length - 1];
  const centile = birthDate && latest ? valueToCentile(metric, curveSex, latest.x, latest.value) : null;

  return (
    <section className="rounded-card border border-border/60 bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-baby-soft text-accent-baby-strong">
          <Ruler className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-tight">Growth</h2>
          <p className="text-xs text-muted-foreground">
            WHO {sex ? (sex === "male" ? "boys'" : "girls'") : ""} percentiles
          </p>
        </div>
        <Button variant="squish" onClick={() => setAdding(true)} className="rounded-full px-4">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {!sex && birthDate ? (
          <m.div
            key="sex-prompt"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-2xl bg-muted p-4">
              <p className="text-sm font-bold">Which growth curves should we use?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                WHO charts differ for boys and girls. Showing boys&apos; curves until you choose — this also sets a soft
                accent color (change it any time in Settings).
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => chooseSex("male")}>
                  Boy
                </Button>
                <Button variant="outline" size="lg" onClick={() => chooseSex("female")}>
                  Girl
                </Button>
              </div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl label="Measurement" value={metric} onChange={setMetric} options={GROWTH_METRICS.map((g) => ({ value: g.key, label: g.label }))} className="flex-1" />
        {sex ? (
          <SegmentedControl
            label="WHO curves"
            size="sm"
            value={sex}
            onChange={chooseSex}
            options={[
              { value: "male", label: "Boy" },
              { value: "female", label: "Girl" },
            ]}
            className="w-32"
          />
        ) : null}
      </div>

      {latest ? (
        <div className="mb-4">
          <GrowthBadge
            label={meta.label}
            value={latest.value}
            unit={meta.unit}
            decimals={metric === "weight" ? 2 : 1}
            centile={centile}
            ageMonths={birthDate ? latest.x : null}
            sub={`${shortDate(latest.date)}${metric === "weight" ? ` · ${kgToLbOz(latest.value)}` : ""}`}
          />
        </div>
      ) : null}

      {birthDate ? (
        <>
          <GrowthChart metric={metric} sex={curveSex} unit={meta.unit} points={points} />
          <p className="mt-2 text-xs text-muted-foreground">
            Shaded bands are the WHO 3rd–97th and 15th–85th percentiles; the dashed line is the median.
          </p>
        </>
      ) : points.length ? (
        <DateChart points={points} unit={meta.unit} label={meta.label} />
      ) : null}

      {points.length === 0 ? (
        <EmptyState
          compact
          className="mt-4"
          title={`No ${meta.label.toLowerCase()} yet`}
          body="Add one from your next checkup to see the curve."
          action={
            <Button variant="soft" onClick={() => setAdding(true)} className="rounded-full">
              <Plus className="h-4 w-4" /> Add measurement
            </Button>
          }
        />
      ) : null}

      {measurements.length > 0 ? <EntryList measurements={measurements} metric={metric} unit={meta.unit} /> : null}

      {adding ? (
        <AddMeasurementSheet
          open={adding}
          onOpenChange={setAdding}
          measurements={measurements}
          birthDate={birthDate}
          sex={curveSex}
        />
      ) : null}
    </section>
  );
}

/** Fallback: plot vs measurement date when we don't know the birth date. */
function DateChart({ points, unit, label }: { points: { date: string; value: number }[]; unit: string; label: string }) {
  const { ref, inView, anim } = useChartAnimation();
  return (
    <div ref={ref} className="h-[200px]">
      {inView ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
            <XAxis dataKey="date" tick={axisTick} tickFormatter={shortDate} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
            <Tooltip content={<ChartTooltip format={(v) => `${v} ${unit}`} />} />
            <Line
              type="monotone"
              dataKey="value"
              name={label}
              stroke="var(--accent-baby-strong)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--card)", stroke: "var(--accent-baby-strong)", strokeWidth: 2.5 }}
              {...anim}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

function EntryList({ measurements, metric, unit }: { measurements: GrowthRow[]; metric: GrowthMetric; unit: string }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();
  const rows = [...measurements]
    .filter((r) => !hidden.has(r.id))
    .sort((a, b) => b.measured_on.localeCompare(a.measured_on))
    .slice(0, 6);

  const remove = (row: GrowthRow) => {
    setHidden((h) => new Set(h).add(row.id));
    startTransition(async () => {
      try {
        await removeMeasurement(row.id);
        toast.log("Measurement deleted", {
          undo: async () => {
            await addMeasurement({
              measured_on: row.measured_on,
              weight_g: row.weight_g,
              height_cm: row.height_cm,
              head_cm: row.head_cm,
            });
          },
        });
      } catch (e) {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(row.id);
          return n;
        });
        toast.error("Couldn't delete that", e instanceof Error ? e.message : undefined);
      }
    });
  };

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent entries</h3>
      <ul className="overflow-hidden rounded-2xl bg-muted/60">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const v = metricValue(r, metric);
            return (
              <m.li
                key={r.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.gentle}
                className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0"
              >
                <span className="w-16 text-muted-foreground">{shortDate(r.measured_on)}</span>
                <span className="font-bold nums">{v == null ? "—" : `${v} ${unit}`}</span>
                <button
                  type="button"
                  onClick={() => remove(r)}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete measurement from ${shortDate(r.measured_on)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </m.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
