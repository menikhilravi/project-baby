import { Settings as SettingsIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { getPhase } from "@/lib/phase";
import { SettingsForm } from "./_components/settings-form";
import { HideSectionsForm } from "./_components/hide-sections-form";
import { CareReminders } from "./_components/care-reminders";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "birth_date, phase_override, hidden_sections, baby_sex, birth_weight_g, feed_reminders, diaper_reminders, feed_interval_min",
    )
    .eq("id", user.id)
    .single();

  const phase = await getPhase();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="nursery"
        icon={SettingsIcon}
        eyebrow="Settings"
        title="Tune the app to where you are."
        subtitle="Set your due/birth date and Night Shift unlocks automatically."
      />

      <SettingsForm
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
        <h2 className="text-sm font-medium mb-1">Care reminders</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Opt into gentle feed &amp; diaper nudges. Turn them on, then subscribe
          each device you want notified.
        </p>
        <CareReminders
          initialFeed={profile?.feed_reminders ?? false}
          initialDiaper={profile?.diaper_reminders ?? false}
          initialIntervalMin={profile?.feed_interval_min ?? null}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-medium mb-1">Visible sections</h2>
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
