"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Baby,
  Droplets,
  Milk,
  Moon,
  Pill,
  Star,
  Syringe,
  Thermometer,
  Utensils,
} from "lucide-react";
import { formatDuration, localDayKey } from "@/lib/baby-stats";
import {
  DIAPER_COLORS,
  FEED_COLOR,
  SLEEP_COLOR,
  VITAMIN_D_COLOR,
} from "@/lib/chart-theme";
import {
  ageLabel,
  buildVisitSummary,
  buildWindow,
  fmtDateTime,
  fmtDay,
  fmtGainPerDay,
  fmtWeight,
  type Measurement,
  type SummaryEvent,
  type VisitSummary,
} from "@/lib/visit-summary";
import { ordinal } from "@/lib/growth-percentiles";
import { cn } from "@/lib/utils";
import type { GivenDose, NextVisitVM } from "../page";
import { VisitRangePicker } from "./visit-range-picker";
import { VisitQuestions, type QuestionRow } from "./visit-questions";
import {
  DayBars,
  DetailTable,
  Note,
  SectionCard,
  StatGrid,
  type Stat,
} from "./summary-ui";

type Props = {
  from: string;
  to: string;
  birthDate: string | null;
  babySex: "male" | "female" | null;
  pediatrician: string | null;
  lastVisitLabel: string | null;
  events: SummaryEvent[];
  measurements: Measurement[];
  givenInWindow: GivenDose[];
  nextVisit: NextVisitVM | null;
  questions: QuestionRow[];
};

export function VisitSummaryView(props: Props) {
  const { from, to, birthDate, babySex, events, measurements } = props;

  // Every number here is bucketed in the viewer's local timezone, so the
  // clock read has to happen after mount — otherwise the server (UTC) and the
  // browser disagree and the whole report hydrates mismatched.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
  }, []);

  const summary = useMemo<VisitSummary | null>(() => {
    if (!now) return null;
    return buildVisitSummary({
      events,
      measurements,
      window: buildWindow(from, to, birthDate, now),
      birthDate,
      babySex,
      now,
    });
  }, [now, events, measurements, from, to, birthDate, babySex]);

  return (
    <div className="space-y-5">
      <VisitRangePicker
        from={from}
        to={to}
        days={summary?.window.days ?? 0}
        hint={props.lastVisitLabel}
      />

      {summary == null ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      ) : (
        <Report {...props} summary={summary} now={now!} />
      )}
    </div>
  );
}

function Report({
  summary: s,
  now,
  birthDate,
  pediatrician,
  givenInWindow,
  nextVisit,
  questions,
}: Props & { summary: VisitSummary; now: Date }) {
  const w = s.window;
  const ageAtVisit = ageLabel(birthDate, w.to);

  return (
    <div className="space-y-5">
      <Masthead
        summary={s}
        now={now}
        ageAtVisit={ageAtVisit}
        pediatrician={pediatrician}
        nextVisitLabel={nextVisit?.label ?? null}
      />

      {s.isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing was logged between {fmtDay(w.from, now)} and{" "}
            {fmtDay(w.through, now)}. Widen the range, or start logging feeds
            and diapers and this fills itself in.
          </p>
        </div>
      ) : (
        <>
          <GrowthSection summary={s} now={now} />
          <FeedingSection summary={s} />
          <DiaperSection summary={s} />
          <SleepSection summary={s} />
          <TempSection summary={s} />
          <MedsSection summary={s} />
          <ActivitySection summary={s} />
          <MilestoneSection summary={s} now={now} />
        </>
      )}

      <VaccineSection
        given={givenInWindow}
        nextVisit={nextVisit}
        now={now}
      />

      <VisitQuestions questions={questions} />

      <p className="text-[11px] leading-relaxed text-muted-foreground print:mt-4">
        Compiled from what was logged in this app — it will only be as complete
        as the logging behind it, and reference ranges are published averages,
        not medical advice. Your pediatrician&apos;s own measurements and
        judgment come first.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Masthead({
  summary: s,
  now,
  ageAtVisit,
  pediatrician,
  nextVisitLabel,
}: {
  summary: VisitSummary;
  now: Date;
  ageAtVisit: string | null;
  pediatrician: string | null;
  nextVisitLabel: string | null;
}) {
  const w = s.window;
  const coverage = Math.round((s.loggedDays / w.days) * 100);

  return (
    <header className="rounded-2xl border border-border bg-card px-4 py-4 print:rounded-none print:border-0 print:border-b print:border-neutral-400 print:px-0">
      <h2 className="font-display text-xl font-bold tracking-tight">
        Visit summary
        {nextVisitLabel ? (
          <span className="text-muted-foreground"> · {nextVisitLabel}</span>
        ) : null}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {fmtDay(w.from, now)} → {fmtDay(w.to, now)} · {w.days}{" "}
        {w.days === 1 ? "day" : "days"}
        {ageAtVisit ? ` · ${ageAtVisit} at the visit` : ""}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {s.loggedDays} of {w.days} days have entries ({coverage}% coverage)
        {w.daysUntilVisit > 0
          ? ` · ${w.daysUntilVisit} ${w.daysUntilVisit === 1 ? "day" : "days"} until the visit`
          : ""}
        {pediatrician ? ` · ${pediatrician}` : ""}
      </p>
    </header>
  );
}

function GrowthSection({
  summary: s,
  now,
}: {
  summary: VisitSummary;
  now: Date;
}) {
  const g = s.growth;
  const latest = g.latest;
  const centile = (v: number | null | undefined) =>
    v == null ? undefined : `${ordinal(v)} percentile`;

  const stats: Stat[] = [];
  if (latest?.weight_g != null) {
    stats.push({
      label: "Weight",
      value: fmtWeight(latest.weight_g),
      hint: centile(g.centiles?.weight),
    });
  }
  if (g.weightGainG != null) {
    stats.push({
      label: "Total gain",
      value: `${g.weightGainG >= 0 ? "+" : "−"}${Math.abs(Math.round(g.weightGainG))} g`,
      hint:
        g.weightGainSpanDays != null
          ? `over ${g.weightGainSpanDays} days`
          : undefined,
    });
  }
  if (latest?.height_cm != null) {
    stats.push({
      label: "Length",
      value: `${latest.height_cm} cm`,
      hint:
        centile(g.centiles?.height) ??
        (g.lengthGainCm != null
          ? `+${g.lengthGainCm.toFixed(1)} cm`
          : undefined),
    });
  }
  if (latest?.head_cm != null) {
    stats.push({
      label: "Head",
      value: `${latest.head_cm} cm`,
      hint:
        centile(g.centiles?.head) ??
        (g.headGainCm != null ? `+${g.headGainCm.toFixed(1)} cm` : undefined),
    });
  }
  if (g.lengthGainCm != null && latest?.height_cm != null) {
    stats.push({
      label: "Length gain",
      value: `+${g.lengthGainCm.toFixed(1)} cm`,
    });
  }
  if (g.headGainCm != null && latest?.head_cm != null) {
    stats.push({ label: "Head gain", value: `+${g.headGainCm.toFixed(1)} cm` });
  }

  const expected = g.expectedGain;
  const perDay = g.weightGainGPerDay;
  const below = expected != null && perDay != null && perDay < expected.low;

  return (
    <SectionCard
      icon={Baby}
      accent="text-reports"
      title="Growth"
      headline={perDay != null ? fmtGainPerDay(perDay) : "—"}
      sub={
        perDay != null
          ? "average weight gain"
          : "no weigh-ins to compare in this range"
      }
    >
      <StatGrid items={stats} />

      {expected != null && perDay != null ? (
        <Note tone={below ? "flag" : "good"}>
          Published averages for {expected.label} are about {expected.low}–
          {expected.high} g/day.{" "}
          {below
            ? "This window came in under that — worth asking about, especially if the last weigh-in was a while ago."
            : "This window is in that range."}
        </Note>
      ) : null}

      {g.inWindow.length > 0 ? (
        <DetailTable
          head={["Date", "Weight", "Length", "Head"]}
          rows={g.inWindow.map((m) => ({
            key: m.measured_on,
            cells: [
              fmtDay(m.measured_on, now),
              m.weight_g != null ? `${(m.weight_g / 1000).toFixed(2)} kg` : "—",
              m.height_cm != null ? `${m.height_cm} cm` : "—",
              m.head_cm != null ? `${m.head_cm} cm` : "—",
            ],
          }))}
        />
      ) : (
        <Note>
          No measurements recorded in this window
          {g.baseline
            ? ` — the numbers above are from ${fmtDay(g.baseline.measured_on, now)}.`
            : ". Add one from Reports → Growth after the visit."}
        </Note>
      )}
    </SectionCard>
  );
}

function FeedingSection({ summary: s }: { summary: VisitSummary }) {
  const f = s.feeding;
  if (f.totalFeeds === 0) return null;

  const stats: Stat[] = [
    {
      label: "Typical gap",
      value:
        f.medianIntervalMin != null
          ? formatDuration(f.medianIntervalMin)
          : "—",
      hint: "median between feeds",
    },
    {
      label: "Longest gap",
      value: f.longestGapMin != null ? formatDuration(f.longestGapMin) : "—",
      hint: f.longestGapAt ? fmtDateTime(f.longestGapAt) : undefined,
    },
    {
      label: "Night feeds",
      value: `${f.nightFeedsPerDay.toFixed(1)}/night`,
      hint: "10pm–6am",
    },
  ];
  if (f.nursingSessions > 0) {
    stats.push({
      label: "Nursing",
      value: `${Math.round(f.avgNursingMin ?? 0)} min avg`,
      hint: `${f.nursingSessions} timed sessions`,
    });
    stats.push({
      label: "Sides",
      value: `L ${f.sideSplit.left} · R ${f.sideSplit.right}`,
      hint: "sessions per side",
    });
  }
  if (f.totalOz > 0) {
    stats.push({
      label: "Bottle intake",
      value: `${f.ozPerDay.toFixed(1)} oz/day`,
      hint: `${Math.round(f.totalOz)} oz total`,
    });
  }
  if (f.bottleFeeds > 0 || f.solidFeeds > 0) {
    stats.push({
      label: "Mix",
      value: `${f.totalFeeds - f.bottleFeeds - f.solidFeeds} breast · ${f.bottleFeeds} bottle${
        f.solidFeeds > 0 ? ` · ${f.solidFeeds} solid` : ""
      }`,
    });
  }

  const delta = f.trend ? f.trend.second - f.trend.first : 0;

  return (
    <SectionCard
      icon={Utensils}
      accent="text-kind-feed"
      title="Feeding"
      headline={`${f.perDay.toFixed(1)}/day`}
      sub={`${f.totalFeeds} feeds over ${s.window.days} days`}
    >
      <StatGrid items={stats} />
      <DayBars
        days={s.days}
        value={(d) => d.feeds}
        color={FEED_COLOR}
        format={(v) => `${v} feeds`}
      />
      {f.trend && Math.abs(delta) >= 0.5 ? (
        <Note>
          Feeds {delta < 0 ? "eased from" : "rose from"}{" "}
          {f.trend.first.toFixed(1)}/day early in the window to{" "}
          {f.trend.second.toFixed(1)}/day by the end.
        </Note>
      ) : null}
    </SectionCard>
  );
}

function DiaperSection({ summary: s }: { summary: VisitSummary }) {
  const d = s.diapers;
  if (d.total === 0) return null;

  const shortfallShare = d.loggedDays > 0 ? d.daysBelowTarget / d.loggedDays : 0;

  return (
    <SectionCard
      icon={Droplets}
      accent="text-kind-diaper"
      title="Diapers"
      headline={`${d.wetPerDay.toFixed(1)} wet/day`}
      sub={`${d.dirtyPerDay.toFixed(1)} dirty/day · ${d.total} total`}
    >
      <StatGrid
        items={[
          {
            label: "Age target",
            value: `${d.targetWet}+ wet · ${d.targetDirty}+ dirty`,
          },
          {
            label: "Days under target",
            value: `${d.daysBelowTarget} of ${d.loggedDays}`,
            hint: "days with diapers logged",
            tone: shortfallShare > 0.34 ? "flag" : undefined,
          },
          {
            label: "Days logged",
            value: `${d.loggedDays} of ${s.window.days}`,
          },
        ]}
      />
      <DayBars
        days={s.days}
        value={(day) => day.diapers}
        color={DIAPER_COLORS.pee}
        format={(_, day) => `${day.wet} wet, ${day.dirty} dirty`}
      />
      {shortfallShare > 0.34 ? (
        <Note tone="flag">
          Output was under the age target on {d.daysBelowTarget} of{" "}
          {d.loggedDays} logged days. Worth raising — though partial logging
          looks identical to low output here.
        </Note>
      ) : null}
    </SectionCard>
  );
}

function SleepSection({ summary: s }: { summary: VisitSummary }) {
  const sl = s.sleep;
  if (sl.loggedDays === 0) return null;

  return (
    <SectionCard
      icon={Moon}
      accent="text-kind-sleep"
      title="Sleep"
      headline={`${sl.avgHoursPerDay.toFixed(1)}h/day`}
      sub={`${sl.nightHoursPerDay.toFixed(1)}h at night · ${sl.dayHoursPerDay.toFixed(1)}h in naps`}
    >
      <StatGrid
        items={[
          {
            label: "Longest stretch",
            value: formatDuration(sl.longestStretchMin),
            hint: "best single stretch",
          },
          {
            label: "Typical best stretch",
            value:
              sl.avgLongestStretchMin != null
                ? formatDuration(sl.avgLongestStretchMin)
                : "—",
            hint: "averaged per night",
          },
          {
            label: "Sleeps a day",
            value: sl.sessionsPerDay.toFixed(1),
            hint: `${sl.loggedDays} of ${s.window.days} days logged`,
          },
        ]}
      />
      <DayBars
        days={s.days}
        value={(d) => d.sleepHours}
        color={SLEEP_COLOR}
        format={(v) => `${v.toFixed(1)}h`}
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        Night counts 7pm–7am; an overnight stretch is split across both days.
      </p>
    </SectionCard>
  );
}

function TempSection({ summary: s }: { summary: VisitSummary }) {
  const t = s.temps;
  if (t.readings.length === 0) return null;

  return (
    <SectionCard
      icon={Thermometer}
      accent="text-kind-temp"
      title="Temperature"
      headline={t.maxF != null ? `${t.maxF.toFixed(1)}°F` : "—"}
      sub={`highest of ${t.readings.length} ${t.readings.length === 1 ? "reading" : "readings"}`}
    >
      {t.flaggedCount > 0 ? (
        <Note tone="flag">
          {t.feverCount > 0
            ? `${t.feverCount} reading${t.feverCount === 1 ? "" : "s"} at or above 100.4°F.`
            : "A reading came in below 97°F."}{" "}
          Dates and times are listed below.
        </Note>
      ) : null}
      <DetailTable
        head={["When", "Reading", "Status"]}
        rows={t.readings.slice(0, 20).map((r) => ({
          key: r.at,
          tone:
            r.status === "fever" || r.status === "low"
              ? ("flag" as const)
              : undefined,
          cells: [
            fmtDateTime(r.at),
            `${r.fahrenheit.toFixed(1)}°F`,
            <span key="s" className="capitalize">
              {r.status}
            </span>,
          ],
        }))}
      />
      {t.readings.length > 20 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Showing the 20 most recent of {t.readings.length} readings.
        </p>
      ) : null}
    </SectionCard>
  );
}

function MedsSection({ summary: s }: { summary: VisitSummary }) {
  const m = s.meds;
  if (m.vitaminD.daysGiven === 0 && m.others.length === 0) return null;

  return (
    <SectionCard
      icon={Pill}
      accent="text-kind-med"
      title="Medicine"
      headline={`${m.vitaminD.pct}%`}
      sub={`Vitamin D given on ${m.vitaminD.daysGiven} of ${m.vitaminD.days} days`}
    >
      <DayBars
        days={s.days}
        value={(d) => (d.vitaminD > 0 ? 1 : 0)}
        color={VITAMIN_D_COLOR}
        format={(v) => (v > 0 ? "given" : "not logged")}
        height={20}
      />
      {m.others.length > 0 ? (
        <DetailTable
          head={["Medicine", "Doses", "Last given"]}
          rows={m.others.map((o) => ({
            key: o.subtype,
            cells: [o.label, String(o.count), fmtDateTime(o.lastAt)],
          }))}
        />
      ) : null}
    </SectionCard>
  );
}

function ActivitySection({ summary: s }: { summary: VisitSummary }) {
  const a = s.activity;
  if (a.tummyTotalMin === 0 && a.pumpSessions === 0) return null;

  const stats: Stat[] = [];
  if (a.tummyTotalMin > 0) {
    stats.push({
      label: "Tummy time",
      value: `${Math.round(a.tummyPerDay)} min/day`,
      hint: `on ${a.tummyDays} of ${s.window.days} days`,
    });
    stats.push({
      label: "Tummy total",
      value: formatDuration(a.tummyTotalMin),
    });
  }
  if (a.pumpSessions > 0) {
    stats.push({
      label: "Pumped",
      value: `${a.pumpOzPerDay.toFixed(1)} oz/day`,
      hint: `${a.pumpSessions} sessions · ${Math.round(a.pumpOz)} oz total`,
    });
  }

  return (
    <SectionCard
      icon={Milk}
      accent="text-kind-tummy"
      title="Tummy time & pumping"
    >
      <StatGrid items={stats} />
    </SectionCard>
  );
}

function MilestoneSection({
  summary: s,
  now,
}: {
  summary: VisitSummary;
  now: Date;
}) {
  if (s.milestones.length === 0) return null;
  return (
    <SectionCard
      icon={Star}
      accent="text-reports"
      title="New this window"
      headline={String(s.milestones.length)}
      sub={s.milestones.length === 1 ? "milestone" : "milestones"}
    >
      <ul className="space-y-1.5">
        {s.milestones.map((m) => (
          <li key={m.at} className="flex gap-3 text-[15px]">
            <span className="w-16 shrink-0 tabular-nums text-xs text-muted-foreground">
              {/* Local date, not the UTC slice — a 9pm milestone would
                  otherwise print as the next day. */}
              {fmtDay(localDayKey(new Date(m.at)), now)}
            </span>
            <span>{m.label}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function VaccineSection({
  given,
  nextVisit,
  now,
}: {
  given: GivenDose[];
  nextVisit: NextVisitVM | null;
  now: Date;
}) {
  const due = nextVisit?.vaccines.filter((v) => !v.given) ?? [];
  if (given.length === 0 && due.length === 0) return null;

  return (
    <SectionCard
      icon={Syringe}
      accent="text-checkups"
      title="Immunizations"
      headline={due.length > 0 ? `${due.length} due` : "Up to date"}
      sub={
        nextVisit
          ? `at the ${nextVisit.label} visit`
          : "against the reference schedule"
      }
    >
      {due.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {due.map((v) => (
            <span
              key={v.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm",
                "bg-checkups-soft text-checkups print:bg-transparent print:text-current",
              )}
            >
              {v.label}
              {v.dose !== "yearly" ? (
                <span className="text-xs opacity-70">#{v.dose}</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {given.length > 0 ? (
        <DetailTable
          head={["Given since last visit", "Dose", "Date"]}
          rows={given.map((d) => ({
            key: `${d.key}-${d.givenOn}`,
            cells: [d.label, `#${d.dose}`, fmtDay(d.givenOn, now)],
          }))}
        />
      ) : null}
    </SectionCard>
  );
}
