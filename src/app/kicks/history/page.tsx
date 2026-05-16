import Link from "next/link";
import { ArrowLeft, Footprints } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import {
  Dashboard,
  type KickRow,
  type KickSession,
} from "../_components/dashboard";

export default async function KicksHistoryPage() {
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

  // 8 days of buffer so "last 7 local days" is fully covered in any timezone.
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const since = new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString();

  const [kicksRes, sessionsRes] = await Promise.all([
    supabase
      .from("baby_events")
      .select("id, occurred_at")
      .eq("kind", "kick")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false }),
    supabase.rpc("kick_sessions_for_couple", {
      p_couple_id: coupleId,
      p_user_id: user.id,
      p_since: since,
    }),
  ]);

  const kicks: KickRow[] = (kicksRes.data ?? []).map((k) => ({
    id: k.id,
    occurred_at: k.occurred_at,
  }));
  const sessions: KickSession[] = sessionsRes.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-3">
        <Link
          href="/kicks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to kicks
        </Link>
      </div>
      <PageHero
        tool="kicks"
        icon={Footprints}
        eyebrow="History"
        title="Patterns."
        subtitle="How kicks distribute across days and 2-hour windows."
      />

      <Dashboard kicks={kicks} sessions={sessions} />
    </div>
  );
}
