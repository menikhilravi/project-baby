import { Settings as SettingsIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { updatePhase } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_date, phase_override")
    .eq("id", user.id)
    .single();

  const override = profile?.phase_override ?? "";
  const birth = profile?.birth_date ?? "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="nursery"
        icon={SettingsIcon}
        eyebrow="Settings"
        title="Tune the app to where you are."
        subtitle="Set your due/birth date and Night Shift unlocks automatically."
      />

      <form action={updatePhase} className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 space-y-4">
          <div>
            <Label htmlFor="birth_date" className="text-sm font-medium">
              Baby&apos;s birth date
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Once today is on/after this date, postnatal sections appear in your nav.
            </p>
          </div>
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            defaultValue={birth}
            className="rounded-xl max-w-xs"
          />
        </section>

        <section className="rounded-2xl border bg-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium">Phase</p>
            <p className="text-xs text-muted-foreground mt-1">
              Auto follows the birth date above. Override to pin a mode.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PhaseChoice value="" current={override} label="Auto" />
            <PhaseChoice value="prenatal" current={override} label="Pregnancy" />
            <PhaseChoice value="postnatal" current={override} label="Baby" />
          </div>
        </section>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            className="rounded-2xl"
          >
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

function PhaseChoice({
  value,
  current,
  label,
}: {
  value: string;
  current: string;
  label: string;
}) {
  const checked = current === value;
  return (
    <label
      className={cn(
        "relative flex items-center justify-center rounded-xl border bg-card/60 px-3 py-2.5 text-sm cursor-pointer transition-all",
        "hover:bg-card",
        checked && "border-foreground/40 bg-muted/60 font-medium",
      )}
    >
      <input
        type="radio"
        name="phase_override"
        value={value}
        defaultChecked={checked}
        className="sr-only"
      />
      {label}
    </label>
  );
}
