import { Sun } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { QuickLogPanel } from "@/app/log/_components/quick-log-panel";
import { HealthQuickLog } from "@/app/log/_components/health-quick-log";
import { LastEventsRow, type LastEventCell } from "./_components/last-events-row";
import { LowSuppliesCard, type LowSupply } from "./_components/low-supplies-card";
import { PinnedNotesCard, type PinnedNote } from "./_components/pinned-notes-card";
import { KicksTodayCard } from "./_components/kicks-today-card";
import { NextNapCard, type RawSleep } from "./_components/next-nap-card";
import { FeverAlertCard, type LatestTemp } from "./_components/fever-alert-card";
import {
  DiaperAdequacyCard,
  type DiaperRow,
} from "./_components/diaper-adequacy-card";
import { MedsCard, type MedRow } from "./_components/meds-card";
import { ageInDays } from "@/lib/newborn-health";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, role, birth_date")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;
  const role = profile?.role ?? null;
  const birthDate = profile?.birth_date ?? null;

  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  // 30h covers "today" for any timezone the viewer might be in.
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60_000).toISOString();

  const [
    openSleepRes,
    lastFeedRes,
    lastDiaperRes,
    lastSleepRes,
    suppliesRes,
    notesRes,
    kicksRes,
    recentSleepsRes,
    latestTempRes,
    diapersTodayRes,
    medsRes,
    openNursingRes,
    lastBreastRes,
  ] = await Promise.all([
      supabase
        .from("baby_events")
        .select("id, occurred_at")
        .eq("kind", "sleep")
        .is("ended_at", null)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("id, occurred_at, user_id")
        .eq("kind", "feed")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("id, occurred_at, user_id")
        .eq("kind", "diaper")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("id, occurred_at, ended_at, user_id")
        .eq("kind", "sleep")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
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
        .select("subtype, occurred_at")
        .eq("kind", "diaper")
        .gte("occurred_at", thirtyHoursAgo)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("baby_events")
        .select("subtype, amount, unit, occurred_at")
        .eq("kind", "med")
        .gte("occurred_at", thirtyHoursAgo)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("baby_events")
        .select("id, subtype, occurred_at")
        .eq("kind", "feed")
        .is("ended_at", null)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("baby_events")
        .select("subtype")
        .eq("kind", "feed")
        .not("ended_at", "is", null)
        .in("subtype", ["left", "right"])
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const kickCount = kicksRes.count ?? 0;
  const recentSleeps: RawSleep[] = (recentSleepsRes.data ?? []).map((s) => ({
    occurred_at: s.occurred_at,
    ended_at: s.ended_at,
  }));

  const latestTemp: LatestTemp =
    latestTempRes.data && latestTempRes.data.amount != null
      ? {
          amount: latestTempRes.data.amount,
          unit: (latestTempRes.data.unit as "f" | "c") ?? "f",
          occurred_at: latestTempRes.data.occurred_at,
        }
      : null;
  const diaperRows: DiaperRow[] = (diapersTodayRes.data ?? []).map((d) => ({
    subtype: d.subtype,
    occurred_at: d.occurred_at,
  }));
  const medRows: MedRow[] = (medsRes.data ?? []).map((m) => ({
    subtype: m.subtype,
    amount: m.amount,
    unit: m.unit,
    occurred_at: m.occurred_at,
  }));
  const openNursing = openNursingRes.data
    ? {
        id: openNursingRes.data.id,
        side: (openNursingRes.data.subtype as "left" | "right") ?? "left",
        occurred_at: openNursingRes.data.occurred_at,
      }
    : null;
  const lastBreastSide =
    (lastBreastRes.data?.subtype as "left" | "right" | undefined) ?? null;

  const ageDays = ageInDays(birthDate, new Date());
  // Diaper-output adequacy is a newborn signal — show it through ~12 weeks.
  const showDiaperCard = ageDays == null || ageDays < 84;

  // Build a roleMap for "you" vs partner labelling.
  const membersQuery = coupleId
    ? supabase.from("profiles").select("id, role").eq("couple_id", coupleId)
    : supabase.from("profiles").select("id, role").eq("id", user.id);
  const { data: members } = await membersQuery;
  const roleMap = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.role]),
  );

  const last: LastEventCell[] = [
    {
      kind: "feed",
      occurred_at: lastFeedRes.data?.occurred_at ?? null,
      who:
        lastFeedRes.data?.user_id === user.id
          ? "You"
          : lastFeedRes.data
            ? capitalize(roleMap[lastFeedRes.data.user_id] ?? "partner")
            : null,
    },
    {
      kind: "diaper",
      occurred_at: lastDiaperRes.data?.occurred_at ?? null,
      who:
        lastDiaperRes.data?.user_id === user.id
          ? "You"
          : lastDiaperRes.data
            ? capitalize(roleMap[lastDiaperRes.data.user_id] ?? "partner")
            : null,
    },
    {
      kind: "sleep",
      occurred_at: openSleepRes.data
        ? openSleepRes.data.occurred_at
        : (lastSleepRes.data?.ended_at ?? lastSleepRes.data?.occurred_at ?? null),
      who: openSleepRes.data ? "ongoing" : null,
      ongoing: Boolean(openSleepRes.data),
    },
  ];

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
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="today"
        icon={Sun}
        eyebrow={formatToday()}
        title="Today."
        subtitle="Tap to log. Glance to check. Sleep when you can."
      />

      <div className="space-y-6">
        <QuickLogPanel
          coupleId={coupleId}
          initialOpenSleep={
            openSleepRes.data
              ? {
                  id: openSleepRes.data.id,
                  occurred_at: openSleepRes.data.occurred_at,
                }
              : null
          }
          initialOpenNursing={openNursing}
          lastBreastSide={lastBreastSide}
          channelName="today_quick"
        />

        <HealthQuickLog birthDate={birthDate} />

        <FeverAlertCard reading={latestTemp} birthDate={birthDate} />

        <LastEventsRow cells={last} />

        {showDiaperCard ? (
          <DiaperAdequacyCard rows={diaperRows} birthDate={birthDate} />
        ) : null}

        <MedsCard rows={medRows} />

        <NextNapCard birthDate={birthDate} sleeps={recentSleeps} />

        <KicksTodayCard count={kickCount} canLog={role === "mom"} />

        {supplies.length > 0 ? <LowSuppliesCard supplies={supplies} /> : null}

        {pinned.length > 0 ? <PinnedNotesCard notes={pinned} /> : null}

        {supplies.length === 0 && pinned.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing urgent. Pin a note or set a supply&apos;s low threshold
              and it&apos;ll surface here.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
