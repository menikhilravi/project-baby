import Link from "next/link";
import { ArrowLeft, Footprints } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { Dashboard, type KickRow } from "../_components/dashboard";

type SearchParams = Promise<{ offset?: string }>;

export default async function KicksHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const parsedOffset = Number.parseInt(params.offset ?? "0", 10);
  const weekOffset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0 && parsedOffset <= 520
      ? parsedOffset
      : 0;

  // Fetch the selected week plus 1 day of buffer on each side so timezone
  // shift doesn't drop edge kicks. Client filters precisely by local time.
  // Window: [weekOffset*7+8 days ago, (weekOffset-1)*7 days ago] in UTC.
  const daysBack = weekOffset * 7 + 8;
  const daysForward = Math.max(0, weekOffset * 7 - 1);
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const sinceTs = Date.now() - daysBack * 24 * 60 * 60_000;
  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const untilTs = Date.now() - daysForward * 24 * 60 * 60_000;
  const since = new Date(sinceTs).toISOString();
  const until = new Date(untilTs).toISOString();

  const { data: kicksData } = await supabase
    .from("baby_events")
    .select("id, occurred_at")
    .eq("kind", "kick")
    .gte("occurred_at", since)
    .lte("occurred_at", until)
    .order("occurred_at", { ascending: false });

  const kicks: KickRow[] = (kicksData ?? []).map((k) => ({
    id: k.id,
    occurred_at: k.occurred_at,
  }));

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

      <Dashboard kicks={kicks} weekOffset={weekOffset} />
    </div>
  );
}
