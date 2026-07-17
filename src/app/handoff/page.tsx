import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { HandoffStatus } from "./_components/handoff-status";
import { HandoffContacts } from "./_components/handoff-contacts";
import { HandoffEditor } from "./_components/handoff-editor";
import type { Contact } from "./actions";

export default async function HandoffPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ? { id: claims.claims.sub } : null;
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select(
      "couple_id, birth_date, care_instructions, pediatrician_name, pediatrician_phone, emergency_contacts",
    )
    .eq("id", user.id)
    .single();
  const coupleId = me?.couple_id ?? null;
  const birthDate = me?.birth_date ?? null;

  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T): T =>
    coupleId ? q.eq("couple_id", coupleId) : q.eq("user_id", user.id);

  // Handoff info can be set by either partner; merge across the couple so the
  // sitter sees it no matter who filled it in.
  const info = {
    careInstructions: me?.care_instructions ?? "",
    pediatricianName: me?.pediatrician_name ?? "",
    pediatricianPhone: me?.pediatrician_phone ?? "",
    emergencyContacts: (me?.emergency_contacts ?? []) as Contact[],
  };
  if (coupleId) {
    const { data: partners } = await supabase
      .from("profiles")
      .select(
        "care_instructions, pediatrician_name, pediatrician_phone, emergency_contacts",
      )
      .eq("couple_id", coupleId);
    const contacts = new Map<string, Contact>();
    for (const p of partners ?? []) {
      info.careInstructions ||= p.care_instructions ?? "";
      info.pediatricianName ||= p.pediatrician_name ?? "";
      info.pediatricianPhone ||= p.pediatrician_phone ?? "";
      for (const c of (p.emergency_contacts ?? []) as Contact[]) {
        if (c.phone) contacts.set(c.phone, c);
      }
    }
    if (contacts.size) info.emergencyContacts = [...contacts.values()];
  }

  const [{ data: lastFeed }, { data: lastDiaper }, { data: sleeps }, { data: vitD }] =
    await Promise.all([
      scope(
        supabase
          .from("baby_events")
          .select("occurred_at, subtype")
          .eq("kind", "feed")
          .order("occurred_at", { ascending: false })
          .limit(1),
      ).maybeSingle(),
      scope(
        supabase
          .from("baby_events")
          .select("occurred_at, subtype")
          .eq("kind", "diaper")
          .order("occurred_at", { ascending: false })
          .limit(1),
      ).maybeSingle(),
      scope(
        supabase
          .from("baby_events")
          .select("occurred_at, ended_at")
          .eq("kind", "sleep")
          .order("occurred_at", { ascending: false })
          .limit(10),
      ),
      scope(
        supabase
          .from("baby_events")
          .select("occurred_at")
          .eq("kind", "med")
          .eq("subtype", "vitamin_d")
          .order("occurred_at", { ascending: false })
          .limit(1),
      ).maybeSingle(),
    ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="handoff"
        icon={Users}
        eyebrow="Handoff"
        title="Everything a sitter needs."
        subtitle="A calm, glanceable snapshot for whoever's watching the baby next."
      />
      <div className="space-y-6">
        <HandoffStatus
          birthDate={birthDate}
          lastFeed={lastFeed ?? null}
          lastDiaper={lastDiaper ?? null}
          sleeps={sleeps ?? []}
          lastVitaminDIso={vitD?.occurred_at ?? null}
        />
        <HandoffContacts
          careInstructions={info.careInstructions}
          pediatricianName={info.pediatricianName}
          pediatricianPhone={info.pediatricianPhone}
          emergencyContacts={info.emergencyContacts}
        />
        <HandoffEditor
          careInstructions={info.careInstructions}
          pediatricianName={info.pediatricianName}
          pediatricianPhone={info.pediatricianPhone}
          emergencyContacts={info.emergencyContacts}
        />
      </div>
    </div>
  );
}
