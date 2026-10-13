import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaggerList } from "@/components/motion/stagger";
import { EmptyState } from "@/components/mascot/empty-state";
import { LowSuppliesCard, type LowSupply } from "./_components/low-supplies-card";
import { PinnedNotesCard, type PinnedNote } from "./_components/pinned-notes-card";
import { KicksTodayCard } from "./_components/kicks-today-card";
import { NextNapCard, type RawSleep } from "./_components/next-nap-card";
import { FeverAlertCard, type LatestTemp } from "./_components/fever-alert-card";
import { DiaperAdequacyCard, type DiaperRow } from "./_components/diaper-adequacy-card";
import { MedsCard, type MedRow } from "./_components/meds-card";
import { TummyTimeCard, type TummyRow } from "./_components/tummy-time-card";
import { TodayLive } from "./_components/today-live";
import { ageInDays } from "@/lib/newborn-health";
import { defaultFeedIntervalMin, medianFeedIntervalMin } from "@/lib/care-schedule";
import { baselineWakeWindowMin, predictNextNap } from "@/lib/wake-window";
import { dailyIntakeRangeOz } from "@/lib/feed-intake";
import { fetchLiveSnapshot } from "@/lib/live-snapshot";
import type { MedScheduleRow } from "@/lib/med-schedule";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims
    ? { id: claims.claims.sub, email: claims.claims.email ?? null }
    : null;
  if (!user) redirect("/login");

  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const nowMs = Date.now();
  const twoHoursAgo = new Date(nowMs - 2 * 60 * 60_000).toISOString();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60_000).toISOString();
  // 30h covers "today" for any timezone the viewer might be in.
  const thirtyHoursAgo = new Date(nowMs - 30 * 60 * 60_000).toISOString();
  // Meds reach back further: the Vitamin D card shows a 7-day catch-up strip.
  const eightDaysAgo = new Date(nowMs - 8 * 24 * 60 * 60_000).toISOString();

  const [
    profileRes,
    live,
    suppliesRes,
    notesRes,
    kicksRes,
    recentSleepsRes,
    latestTempRes,
    medsRes,
    tummyTodayRes,
    medSchedulesRes,
    latestWeightRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("couple_id, role, birth_date, birth_weight_g, feed_interval_min")
      .eq("id", user.id)
      .single(),
    fetchLiveSnapshot(supabase, nowMs),
    supabase
      .from("gear_items")
      .select("id, name, emoji, quantity, low_threshold")
      .eq("kind", "supplies")
      .gt("low_threshold", 0)
      .order("quantity", { ascending: true }),
    supabase
      .from("notes")
      .select("id, title, body")
      .eq("pinned", true)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("baby_events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "kick")
      .gte("occurred_at", twoHoursAgo),
    supabase
      .from("baby_events")
      .select("occurred_at, ended_at")
      .eq("kind", "sleep")
      .gte("occurred_at", sevenDaysAgo)
      .order("occurred_at", { ascending: true }),
    supabase
      .from("baby_events")
      .select("amount, unit, occurred_at")
      .eq("kind", "temp")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("baby_events")
      .select("id, user_id, couple_id, kind, subtype, amount, unit, occurred_at, ended_at, notes")
      .eq("kind", "med")
      .gte("occurred_at", eightDaysAgo)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("baby_events")
      .select("occurred_at, ended_at")
      .eq("kind", "tummy")
      .gte("occurred_at", thirtyHoursAgo)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("med_schedules")
      .select("id, subtype, label, times, amount, unit, active")
      .eq("active", true)
      .order("id", { ascending: true }),
    supabase
      .from("growth_measurements")
      .select("weight_g")
      .not("weight_g", "is", null)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const role = profile?.role ?? null;
  const birthDate = profile?.birth_date ?? null;
  const now = new Date(nowMs);
  const ageDays = ageInDays(birthDate, now);

  const recentSleeps: RawSleep[] = (recentSleepsRes.data ?? []).map((s) => ({
    occurred_at: s.occurred_at,
    ended_at: s.ended_at,
  }));

  // How long between feeds is "typical" for this baby: the parent's own
  // setting, else their observed cadence, else an age-based default.
  const feedIntervalMin =
    profile?.feed_interval_min ??
    medianFeedIntervalMin(live.recent.filter((e) => e.kind === "feed")) ??
    defaultFeedIntervalMin(ageDays);

  const nap = predictNextNap(
    birthDate,
    recentSleeps.map((s) => ({
      start: new Date(s.occurred_at),
      end: s.ended_at ? new Date(s.ended_at) : null,
    })),
    now,
  );
  const wakeWindowMin =
    nap.status === "ok"
      ? nap.wakeWindowMin
      : baselineWakeWindowMin(ageDays != null ? ageDays / 7 : 0);

  const weightG = latestWeightRes.data?.weight_g ?? profile?.birth_weight_g ?? null;
  const intakeRange = dailyIntakeRangeOz(weightG != null ? Number(weightG) / 1000 : null, ageDays);

  const latestTemp: LatestTemp =
    latestTempRes.data && latestTempRes.data.amount != null
      ? {
          amount: latestTempRes.data.amount,
          unit: (latestTempRes.data.unit as "f" | "c") ?? "f",
          occurred_at: latestTempRes.data.occurred_at,
        }
      : null;
  const diaperRows: DiaperRow[] = live.recent
    .filter((e) => e.kind === "diaper")
    .map((d) => ({ subtype: d.subtype, occurred_at: d.occurred_at }));
  const medRows = (medsRes.data ?? []) as MedRow[];
  // Empty when migration 0032 hasn't been applied yet — the card degrades to
  // the un-scheduled view rather than failing the page.
  const medSchedules = (medSchedulesRes.data ?? []) as MedScheduleRow[];
  const tummyRows: TummyRow[] = (tummyTodayRes.data ?? []).map((t) => ({
    occurred_at: t.occurred_at,
    ended_at: t.ended_at,
  }));

  // Diaper-output adequacy is a newborn signal — show it through ~12 weeks.
  const showDiaperCard = ageDays == null || ageDays < 84;
  // Tummy time matters through the roll/sit window — show it through ~6 months.
  const showTummyCard = ageDays == null || ageDays < 180;

  const supplies: LowSupply[] = (suppliesRes.data ?? [])
    .filter((s) => s.quantity <= s.low_threshold)
    .map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      quantity: s.quantity,
      low_threshold: s.low_threshold,
    }));

  const pinned: PinnedNote[] = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    preview: n.body.slice(0, 140),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-10 md:px-8 md:py-12">
      <FeverAlertCard reading={latestTemp} birthDate={birthDate} />

      <TodayLive
        snapshot={live}
        feedIntervalMin={feedIntervalMin}
        wakeWindowMin={wakeWindowMin}
        intakeRange={intakeRange}
      />

      <StaggerList className="space-y-4 [&>*:empty]:hidden" delay={0.1}>
        <NextNapCard birthDate={birthDate} sleeps={recentSleeps} />
        {showDiaperCard ? <DiaperAdequacyCard rows={diaperRows} birthDate={birthDate} /> : null}
        {showTummyCard ? <TummyTimeCard rows={tummyRows} /> : null}
        <MedsCard rows={medRows} schedules={medSchedules} />
        <KicksTodayCard count={kicksRes.count ?? 0} canLog={role === "mom"} />
        {supplies.length > 0 ? <LowSuppliesCard supplies={supplies} /> : null}
        {pinned.length > 0 ? <PinnedNotesCard notes={pinned} /> : null}
        {supplies.length === 0 && pinned.length === 0 ? (
          <EmptyState
            compact
            mood="happy"
            title="Nothing urgent"
            body="Pin a note or set a supply's low threshold and it'll surface here."
          />
        ) : null}
      </StaggerList>
    </div>
  );
}
