"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The report's shared building blocks. Every section is the same shape — an
 * icon, one headline number, supporting stats, then detail — so the page scans
 * top-to-bottom in an exam room and prints as a clean handout.
 */

export function SectionCard({
  icon: Icon,
  accent,
  title,
  headline,
  sub,
  children,
}: {
  icon: LucideIcon;
  accent: string;
  title: string;
  headline?: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <Card className="print:break-inside-avoid print:border-neutral-300 print:shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Icon className={cn("h-3.5 w-3.5", accent)} />
          {title}
        </div>
        {headline ? (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-display nums text-3xl font-bold tracking-tight">
              {headline}
            </span>
            {sub ? (
              <span className="text-xs text-muted-foreground">{sub}</span>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export type Stat = {
  label: string;
  value: string;
  hint?: string;
  /** Draws attention to a number worth raising with the doctor. */
  tone?: "flag";
};

/** A compact grid of supporting numbers — the "and also" under a headline. */
export function StatGrid({ items }: { items: Stat[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 print:grid-cols-3">
      {items.map((s) => (
        <div key={s.label}>
          <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {s.label}
          </dt>
          <dd
            className={cn(
              "nums text-[15px] font-semibold leading-tight",
              s.tone === "flag" && "text-destructive",
            )}
          >
            {s.value}
          </dd>
          {s.hint ? (
            <dd className="text-[11px] leading-tight text-muted-foreground">
              {s.hint}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * A day-by-day bar strip. Deliberately plain CSS rather than recharts: it
 * needs no measurement pass, survives `window.print()` intact, and stays
 * readable at 60+ bars where a real chart's axis would be noise.
 */
export function DayBars<T extends { date: string; label: string }>({
  days,
  value,
  color,
  format,
  height = 44,
}: {
  days: T[];
  value: (d: T) => number;
  color: string;
  format: (v: number, d: T) => string;
  height?: number;
}) {
  const values = days.map(value);
  const max = Math.max(...values, 1);
  if (days.length === 0) return null;

  return (
    <div className="mt-3">
      <div
        className="flex items-end gap-px"
        style={{ height }}
        role="img"
        aria-label={`Daily values from ${days[0].label} to ${days[days.length - 1].label}`}
      >
        {days.map((d, i) => {
          const v = values[i];
          return (
            <div
              key={d.date}
              title={`${d.label} — ${format(v, d)}`}
              className="min-w-[2px] flex-1 rounded-[2px]"
              style={{
                height: v > 0 ? `${Math.max(6, (v / max) * 100)}%` : 2,
                background: v > 0 ? color : "var(--border)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{days[0].label}</span>
        {days.length > 2 ? (
          <span>{days[Math.floor(days.length / 2)].label}</span>
        ) : null}
        <span>{days[days.length - 1].label}</span>
      </div>
    </div>
  );
}

/** A short callout — the one line you'd want to say out loud at the visit. */
export function Note({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "flag";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "mt-3 rounded-xl px-3 py-2 text-[13px] leading-relaxed print:border print:border-neutral-300 print:bg-transparent",
        tone === "flag" && "bg-destructive/10 text-destructive",
        tone === "good" && "bg-hospital-soft text-hospital",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

/** A plain two-column detail table — measurements, readings, doses. */
export function DetailTable({
  head,
  rows,
}: {
  head: string[];
  rows: Array<{ key: string; cells: ReactNode[]; tone?: "flag" }>;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="pb-1.5 pr-3 font-medium last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={r.key}
              className={cn("nums", r.tone === "flag" && "text-destructive")}
            >
              {r.cells.map((c, i) => (
                <td key={i} className="py-1.5 pr-3 align-top last:pr-0">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
