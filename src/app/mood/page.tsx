import { HeartPulse } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { MoodCheckin } from "./_components/mood-checkin";
import { MoodHistory, type MoodEntry } from "./_components/mood-history";

export default async function MoodPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ? { id: claims.claims.sub } : null;
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("mood_checkins")
    .select("id, taken_on, score, self_harm")
    .eq("user_id", user.id)
    .order("taken_on", { ascending: false })
    .limit(24);

  const history: MoodEntry[] = (rows ?? []).map((r) => ({
    id: r.id,
    takenOn: r.taken_on,
    score: r.score,
    selfHarm: r.self_harm,
  }));

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="mood"
        icon={HeartPulse}
        eyebrow="Mood"
        title="How are you, really?"
        subtitle="A quick, private weekly check-in based on the Edinburgh scale — just for you, not shared with your partner."
      />
      <div className="space-y-8">
        <MoodHistory history={history} />
        <MoodCheckin />
      </div>
    </div>
  );
}
