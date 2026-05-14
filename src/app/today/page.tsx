import { Sun } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { QuickLogPanel } from "@/app/log/_components/quick-log-panel";
import { LastEventsRow, type LastEventCell } from "./_components/last-events-row";
import { LowSuppliesCard, type LowSupply } from "./_components/low-supplies-card";
import { PinnedNotesCard, type PinnedNote } from "./_components/pinned-notes-card";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;

  const [openSleepRes, lastFeedRes, lastDiaperRes, lastSleepRes, suppliesRes, notesRes] =
    await Promise.all([
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
    ]);

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
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
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
          channelName="today_quick"
        />

        <LastEventsRow cells={last} />

        {supplies.length > 0 ? <LowSuppliesCard supplies={supplies} /> : null}

        {pinned.length > 0 ? <PinnedNotesCard notes={pinned} /> : null}

        {supplies.length === 0 && pinned.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center">
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
