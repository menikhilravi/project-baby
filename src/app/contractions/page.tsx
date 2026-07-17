import { Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import type { Contraction } from "@/lib/contractions";
import { ContractionTimer } from "./_components/contraction-timer";

export default async function ContractionsPage() {
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

  // Pull a generous window so the timeline and the "sustained 1h" check have
  // history to work with even across a timezone offset from server UTC.
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const since = new Date(Date.now() - 12 * 60 * 60_000).toISOString();

  const { data } = await supabase
    .from("baby_events")
    .select("id, occurred_at, ended_at")
    .eq("kind", "contraction")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });

  const initial: Contraction[] = (data ?? []).map((c) => ({
    id: c.id,
    start: c.occurred_at,
    end: c.ended_at,
  }));

  return (
    <div className="mx-auto max-w-xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="contractions"
        icon={Activity}
        eyebrow="Labor timer"
        title="Time the contractions."
        subtitle="Tap when a contraction starts, tap again when it eases. We'll track the 5-1-1 pattern and flag the real deal."
      />

      <ContractionTimer
        coupleId={coupleId}
        canLog={role === "mom"}
        initial={initial}
      />
    </div>
  );
}
