import { Settings as SettingsIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./_components/settings-form";
import { HideSectionsForm } from "./_components/hide-sections-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_date, phase_override, hidden_sections")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
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
      />

      <div className="mt-10">
        <h2 className="text-sm font-medium mb-1">Visible sections</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Turn sections off if you don&apos;t use them. They&apos;ll disappear from the nav but remain accessible by URL.
        </p>
        <HideSectionsForm
          initialHidden={profile?.hidden_sections ?? []}
        />
      </div>
    </div>
  );
}
