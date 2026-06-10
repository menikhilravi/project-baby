import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import type { RawEvent } from "@/lib/baby-stats";
import { ReportsDashboard } from "./_components/reports-dashboard";
import { GrowthCard, type GrowthRow } from "./_components/growth-card";

export default async function ReportsPage() {
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

  // 30-day window + ~1 day of buffer so the client can bucket by local-day
  // boundaries (rows are UTC; offset can be up to ±14h from server time).
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const since = new Date(Date.now() - 31 * 24 * 60 * 60_000).toISOString();

  const query = supabase
    .from("baby_events")
    .select("kind, subtype, amount, unit, occurred_at, ended_at")
    .gte("occurred_at", since)
    .neq("kind", "kick")
    .order("occurred_at", { ascending: true });
  if (coupleId) query.eq("couple_id", coupleId);
  else query.eq("user_id", user.id);

  const growthQuery = supabase
    .from("growth_measurements")
    .select("id, measured_on, weight_g, height_cm, head_cm")
    .order("measured_on", { ascending: true });
  if (coupleId) growthQuery.eq("couple_id", coupleId);
  else growthQuery.eq("user_id", user.id);

  const [{ data }, { data: growthData }] = await Promise.all([
    query,
    growthQuery,
  ]);
  const events = (data ?? []) as RawEvent[];
  const measurements = (growthData ?? []) as GrowthRow[];

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="reports"
        icon={BarChart3}
        eyebrow="Reports"
        title="Patterns, not guesswork."
        subtitle="Sleep, feeds, and diapers over time — see what's actually happening."
      />
      <ReportsDashboard events={events} />
      <div className="mt-6">
        <GrowthCard measurements={measurements} birthDate={birthDate} />
      </div>
    </div>
  );
}
