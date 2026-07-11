import { Moon } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { Logger, type BabyEventRow, type RoleMap } from "./_components/logger";

export default async function LogPage() {
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

  const membersQuery = coupleId
    ? supabase.from("profiles").select("id, role").eq("couple_id", coupleId)
    : supabase.from("profiles").select("id, role").eq("id", user.id);
  const { data: members } = await membersQuery;
  const roleMap: RoleMap = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.role]),
  );

  // eslint-disable-next-line react-hooks/purity -- server component reading wall-clock time
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("baby_events")
    .select(
      "id, user_id, couple_id, kind, subtype, amount, unit, occurred_at, ended_at, notes",
    )
    .gte("occurred_at", since)
    .neq("kind", "kick")
    .order("occurred_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="logger"
        icon={Moon}
        eyebrow="Night Shift"
        title="Tap. Logged. Synced."
        subtitle="Feeds, diapers, and sleep — visible to you and your partner in real time."
      />
      <Logger
        initialEvents={(events ?? []) as BabyEventRow[]}
        currentUserId={user.id}
        coupleId={coupleId}
        birthDate={birthDate}
        roleMap={roleMap}
      />
    </div>
  );
}
