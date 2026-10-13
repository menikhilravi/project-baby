import { Settings as SettingsIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { getPhase } from "@/lib/phase";
import { SettingsForm } from "./_components/settings-form";
import { HideSectionsForm } from "./_components/hide-sections-form";
import { CareReminders } from "./_components/care-reminders";
import { MedReminders } from "./_components/med-reminders";
import { AppearanceForm } from "./_components/appearance-form";
import { isAccent } from "@/lib/theme";
import type { MedScheduleRow } from "@/lib/med-schedule";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims
    ? { id: claims.claims.sub, email: claims.claims.email ?? null }
    : null;
  if (!user) redirect("/login");

  const BASE_COLUMNS =
    "birth_date, phase_override, hidden_sections, baby_sex, birth_weight_g, feed_reminders, diaper_reminders, feed_interval_min";
  const [profileRes, { data: medSchedules }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`${BASE_COLUMNS}, baby_name, baby_accent`)
      .eq("id", user.id)
      .single(),
    // Empty until migration 0032 is applied — the card just shows no rows.
    supabase
      .from("med_schedules")
      .select("id, subtype, label, times, amount, unit, active")
      .order("id", { ascending: true }),
  ]);

  // Until migration 0034 lands the new columns don't exist; retry without.
  const profile: (typeof profileRes)["data"] = profileRes.error
    ? ((
        await supabase.from("profiles").select(BASE_COLUMNS).eq("id", user.id).single()
      ).data as (typeof profileRes)["data"])
    : profileRes.data;

  const phase = await getPhase();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="nursery"
        icon={SettingsIcon}
        eyebrow="Settings"
        title="Make it yours."
        subtitle="Theme, your baby's details, reminders and which sections you see."
      />

      <AppearanceForm
        sex={profile?.baby_sex ?? null}
        initialOverride={isAccent(profile?.baby_accent) ? profile.baby_accent : null}
      />

      <h2 className="font-display text-lg font-semibold mt-10 mb-3">Your baby</h2>
      <SettingsForm
        initialName={profile?.baby_name ?? ""}
        initialBirthDate={profile?.birth_date ?? ""}
        initialOverride={profile?.phase_override ?? ""}
        initialSex={profile?.baby_sex ?? ""}
        initialBirthWeightKg={
          profile?.birth_weight_g != null
            ? String(profile.birth_weight_g / 1000)
            : ""
        }
      />

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold mb-1">Care reminders</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Opt into gentle feed, diaper &amp; medicine nudges. Turn them on, then
          subscribe each device you want notified.
        </p>
        <CareReminders
          initialFeed={profile?.feed_reminders ?? false}
          initialDiaper={profile?.diaper_reminders ?? false}
          initialIntervalMin={profile?.feed_interval_min ?? null}
        />
        <div className="mt-3">
          <MedReminders
            initialSchedules={(medSchedules ?? []) as MedScheduleRow[]}
          />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold mb-1">Visible sections</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Turn sections off if you don&apos;t use them. They&apos;ll disappear from the nav but remain accessible by URL.
        </p>
        <HideSectionsForm
          initialHidden={profile?.hidden_sections ?? []}
          phase={phase}
        />
      </div>
    </div>
  );
}
