import { Footprints } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { KickCounter } from "./_components/kick-counter";
import { HistoryStrip, type KickSession } from "./_components/history-strip";

export default async function KicksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, role")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;
  const role = profile?.role ?? null;

  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const [kicksRes, sessionsRes] = await Promise.all([
    supabase
      .from("baby_events")
      .select("id, occurred_at")
      .eq("kind", "kick")
      .gte("occurred_at", twoHoursAgo)
      .order("occurred_at", { ascending: false }),
    supabase.rpc("kick_sessions_for_couple", {
      p_couple_id: coupleId,
      p_user_id: user.id,
      p_since: sevenDaysAgo,
    }),
  ]);

  const initialKicks = (kicksRes.data ?? []).map((k) => ({
    id: k.id,
    occurred_at: k.occurred_at,
  }));
  const sessions: KickSession[] = sessionsRes.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="kicks"
        icon={Footprints}
        eyebrow="Kick count"
        title="Count the kicks."
        subtitle="Tap each time you feel a kick. Aim for 10 in 2 hours."
      />

      <div className="space-y-8">
        <KickCounter
          coupleId={coupleId}
          canLog={role === "mom"}
          initialKicks={initialKicks}
        />
        <HistoryStrip sessions={sessions} />
      </div>
    </div>
  );
}
