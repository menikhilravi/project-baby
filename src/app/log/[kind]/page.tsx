import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { KIND_META, isEventKind, type EventKind } from "@/lib/kind-meta";
import { dayBuckets, formatDuration, rangeStats } from "@/lib/baby-stats";
import type { RawEvent } from "@/lib/baby-stats";
import { medLabel } from "@/lib/baby-events";
import { ActivityDetail } from "../_components/activity-detail";
import { ActivityMetrics } from "../_components/activity-metrics";
import type { BabyEventRow, RoleMap } from "../_components/timeline";

const HIGH_FREQUENCY: EventKind[] = ["feed", "diaper", "sleep", "tummy", "pump"];

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind: kindParam } = await params;
  if (!isEventKind(kindParam)) notFound();
  const kind = kindParam;
  const meta = KIND_META[kind];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, birth_date")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;
  const birthDate = profile?.birth_date ?? null;

  const membersQuery = coupleId
    ? supabase.from("profiles").select("id, role").eq("couple_id", coupleId)
    : supabase.from("profiles").select("id, role").eq("id", user.id);
  const { data: members } = await membersQuery;
  const roleMap: RoleMap = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.role]),
  );

  const windowDays = HIGH_FREQUENCY.includes(kind) ? 30 : 365;
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const { data: events } = await supabase
    .from("baby_events")
    .select(
      "id, user_id, couple_id, kind, subtype, amount, unit, occurred_at, ended_at, notes",
    )
    .eq("kind", kind)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(200);

  const rows = (events ?? []) as BabyEventRow[];
  // Feed & diaper get the rich client metrics (charts + prediction/adequacy);
  // everything else keeps the compact server-rendered stat strip.
  const richKind = kind === "feed" || kind === "diaper";
  const metrics = richKind ? [] : computeMetrics(kind, rows);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="logger"
        icon={meta.icon}
        eyebrow={meta.plural}
        title={`${meta.label}.`}
        subtitle="The full trace — add a missed entry, edit a time, or delete."
      />

      {richKind ? (
        <ActivityMetrics kind={kind} rows={rows} birthDate={birthDate} />
      ) : null}

      {metrics.length > 0 ? (
        <div className="mb-6 grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border bg-card px-3 py-3"
            >
              <p className="font-display nums text-2xl leading-none font-bold tracking-tight">
                {m.value}
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <ActivityDetail
        kind={kind}
        initialEvents={rows}
        currentUserId={user.id}
        coupleId={coupleId}
        roleMap={roleMap}
      />
    </div>
  );
}

type Metric = { label: string; value: string };

function computeMetrics(kind: EventKind, rows: BabyEventRow[]): Metric[] {
  if (rows.length === 0) return [];
  const now = new Date();

  if (kind === "feed" || kind === "diaper" || kind === "sleep") {
    const buckets = dayBuckets(rows as unknown as RawEvent[], 7, now);
    const today = buckets[buckets.length - 1];
    const stats = rangeStats(buckets);
    if (kind === "feed") {
      const out: Metric[] = [
        { label: "Today", value: String(today.feeds) },
        { label: "7-day avg", value: `${round1(stats.avgFeeds)}/day` },
      ];
      if (stats.totalFeedOz > 0) {
        out.push({ label: "Oz · 7 days", value: round1(stats.totalFeedOz) });
      }
      return out;
    }
    if (kind === "diaper") {
      return [
        { label: "Today", value: String(today.diapers) },
        { label: "7-day avg", value: `${round1(stats.avgDiapers)}/day` },
        {
          label: "Pee / poop",
          value: `${today.pee} / ${today.poop + today.both}`,
        },
      ];
    }
    // sleep
    return [
      { label: "Today", value: formatDuration(today.sleepHours * 60) },
      { label: "Longest today", value: formatDuration(today.longestSleepMin) },
      { label: "7-day avg", value: formatDuration(stats.avgSleepHours * 60) },
    ];
  }

  const todayRows = rows.filter((r) => isSameLocalDay(r.occurred_at, now));

  if (kind === "temp") {
    const latest = rows[0];
    return [
      {
        label: "Latest",
        value:
          latest.amount != null
            ? `${latest.amount}°${(latest.unit ?? "f").toUpperCase()}`
            : "—",
      },
      { label: "Readings", value: String(rows.length) },
    ];
  }

  if (kind === "med") {
    return [
      { label: "Today", value: String(todayRows.length) },
      { label: "Latest", value: medLabel(rows[0].subtype) },
    ];
  }

  if (kind === "pump") {
    const totalOz = rows.reduce((s, r) => {
      if (r.amount == null) return s;
      return s + (r.unit === "ml" ? r.amount / 29.5735 : r.amount);
    }, 0);
    return [
      { label: "Sessions", value: String(rows.length) },
      { label: "Total oz", value: round1(totalOz) },
    ];
  }

  if (kind === "tummy") {
    const todayMin = todayRows.reduce((s, r) => s + durationMin(r), 0);
    return [
      { label: "Today", value: formatDuration(todayMin) },
      { label: "Sessions today", value: String(todayRows.length) },
    ];
  }

  // milestone
  return [
    { label: "Milestones", value: String(rows.length) },
    { label: "Latest", value: rows[0].notes ?? "—" },
  ];
}

function durationMin(r: BabyEventRow): number {
  if (!r.ended_at) return 0;
  return Math.max(
    0,
    (new Date(r.ended_at).getTime() - new Date(r.occurred_at).getTime()) /
      60_000,
  );
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
