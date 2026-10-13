import { ViewTransition } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { StatTile } from "@/components/ui/stat-tile";
import type { MascotMood } from "@/components/mascot/baby-mascot";
import { dailyIntakeRangeOz } from "@/lib/feed-intake";
import { ageInDays } from "@/lib/newborn-health";
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
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims
    ? { id: claims.claims.sub, email: claims.claims.email ?? null }
    : null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, birth_date, birth_weight_g")
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

  let intakeRange: { low: number; high: number } | null = null;
  if (kind === "feed") {
    const { data: latestWeight } = await supabase
      .from("growth_measurements")
      .select("weight_g")
      .not("weight_g", "is", null)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    const weightG = latestWeight?.weight_g ?? profile?.birth_weight_g ?? null;
    intakeRange = dailyIntakeRangeOz(
      weightG != null ? Number(weightG) / 1000 : null,
      ageInDays(birthDate, new Date()),
    );
  }
  // Feed & diaper get the rich client metrics (charts + prediction/adequacy);
  // everything else keeps the compact server-rendered stat strip.
  const richKind = kind === "feed" || kind === "diaper";
  const metrics = richKind ? [] : computeMetrics(kind, rows);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-10 md:px-8 md:py-12">
      <Link
        href="/today"
        transitionTypes={["nav-back"]}
        className="-ml-2 mb-3 inline-flex h-10 items-center gap-1 rounded-full pl-1 pr-3 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>

      <PageHero
        tool="logger"
        tone={{ bgSoft: meta.tone.bgSoft, text: meta.tone.strong }}
        icon={meta.icon}
        eyebrow={meta.plural}
        title={HEADLINES[kind]}
        subtitle="Add a missed entry, fix a time, or swipe to delete."
        mascot={MOODS[kind]}
        morphName={`kind-${kind}`}
      />

      <ViewTransition
        enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        default="none"
      >
        <div>
          {richKind ? (
            <ActivityMetrics kind={kind} rows={rows} birthDate={birthDate} intakeRange={intakeRange} />
          ) : null}

          {metrics.length > 0 ? (
            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {metrics.map((m) => (
                <StatTile key={m.label} label={m.label} value={m.value} />
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
      </ViewTransition>
    </div>
  );
}

const HEADLINES: Record<EventKind, string> = {
  feed: "Every feed, in one place.",
  diaper: "Diaper log.",
  sleep: "Sleep, tracked gently.",
  temp: "Temperature readings.",
  med: "Medicine given.",
  pump: "Pumping sessions.",
  tummy: "Tummy time.",
  milestone: "Little firsts.",
};

const MOODS: Record<EventKind, MascotMood> = {
  feed: "feeding",
  diaper: "happy",
  sleep: "sleeping",
  temp: "idle",
  med: "idle",
  pump: "happy",
  tummy: "happy",
  milestone: "celebrate",
};

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
