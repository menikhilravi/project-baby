import Link from "next/link";
import { ChevronRight, Footprints } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { KickCounter } from "./_components/kick-counter";
import { TwoHourBins } from "./_components/two-hour-bins";

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

  // Fetch ~30 hours so we cover both the rolling-2h counter and any local
  // "today" (handles up to a 14h offset from server UTC). The TwoHourBins
  // component buckets client-side using local time.
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const since = new Date(Date.now() - 30 * 60 * 60_000).toISOString();

  const { data: kicksData } = await supabase
    .from("baby_events")
    .select("id, occurred_at")
    .eq("kind", "kick")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });

  const initialKicks = (kicksData ?? []).map((k) => ({
    id: k.id,
    occurred_at: k.occurred_at,
  }));

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
        <TwoHourBins kicks={initialKicks} coupleId={coupleId} />
        <Link
          href="/kicks/history"
          className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 px-4 py-3 transition-all hover:bg-card hover:border-border/80 hover:shadow-sm"
        >
          <div>
            <p className="text-sm font-medium">Last 7 days</p>
            <p className="text-[11px] text-muted-foreground">
              Daily totals, sessions, and time-to-10
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
        </Link>
      </div>
    </div>
  );
}
