import { Syringe } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { WELL_VISITS, doseKey } from "@/data/immunizations";
import { visitDueDate, visitStatus, type VisitStatus } from "@/lib/checkups";
import { CheckupsBoard } from "./_components/checkups-board";

export type VaccineVM = {
  code: string;
  label: string;
  dose: string;
  given: boolean;
  givenOn: string | null;
};

export type VisitVM = {
  slug: string;
  label: string;
  ageMonths: number;
  dueISO: string | null;
  status: VisitStatus | null;
  completed: boolean;
  vaccines: VaccineVM[];
};

export default async function CheckupsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ? { id: claims.claims.sub } : null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, birth_date")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;
  const birthDate = profile?.birth_date ?? null;

  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T): T =>
    coupleId ? q.eq("couple_id", coupleId) : q.eq("user_id", user.id);

  const [{ data: appts }, { data: doses }] = await Promise.all([
    scope(
      supabase.from("appointments").select("slug, completed_at"),
    ),
    scope(supabase.from("vaccine_doses").select("vaccine, dose, given_on")),
  ]);

  const completedSlugs = new Set(
    (appts ?? []).filter((a) => a.slug && a.completed_at).map((a) => a.slug),
  );
  const givenOn = new Map(
    (doses ?? []).map((d) => [doseKey(d.vaccine, d.dose), d.given_on]),
  );

  const visits: VisitVM[] = WELL_VISITS.map((v) => {
    const due = birthDate ? visitDueDate(birthDate, v.ageMonths) : null;
    const completed = completedSlugs.has(v.slug);
    return {
      slug: v.slug,
      label: v.label,
      ageMonths: v.ageMonths,
      dueISO: due ? due.toISOString() : null,
      status: due ? visitStatus(due, completed) : null,
      completed,
      vaccines: v.vaccines.map((vac) => ({
        code: vac.code,
        label: vac.label,
        dose: vac.dose,
        given: givenOn.has(doseKey(vac.code, vac.dose)),
        givenOn: givenOn.get(doseKey(vac.code, vac.dose)) ?? null,
      })),
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="checkups"
        icon={Syringe}
        eyebrow="Checkups"
        title="Visits & vaccines, on track."
        subtitle="The AAP well-baby schedule and CDC vaccines — tick them off as you go."
      />
      <CheckupsBoard visits={visits} hasBirthDate={Boolean(birthDate)} />
    </div>
  );
}
