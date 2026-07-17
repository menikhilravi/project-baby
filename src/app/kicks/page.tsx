import Link from "next/link";
import { ChevronRight, Footprints } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { KickCounter } from "./_components/kick-counter";
import { TwoHourBins } from "./_components/two-hour-bins";
import { KickReminders } from "./_components/kick-reminders";

export default async function KicksPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims
    ? { id: claims.claims.sub, email: claims.claims.email ?? null }
    : null;
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
    <div className="mx-auto max-w-xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="kicks"
        icon={Footprints}
        eyebrow="Kick count"
        title="Count the kicks."
        subtitle="Tap each time you feel a kick. Aim for 10 in 2 hours."
      />

      <div className="space-y-12">
        <KickCounter
          coupleId={coupleId}
          canLog={role === "mom"}
          initialKicks={initialKicks}
        />
        <TwoHourBins kicks={initialKicks} coupleId={coupleId} />
        {role === "mom" ? <KickReminders /> : null}
        <Link
          href="/kicks/history"
          className="group flex items-center justify-between gap-3 border-t border-border pt-5 transition-colors"
        >
          <div>
            <p className="text-[15px] font-medium tracking-tight">Last 7 days</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Daily totals, sessions, and time-to-10
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-active:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
