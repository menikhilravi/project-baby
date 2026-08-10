import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { WELL_VISITS, doseKey } from "@/data/immunizations";
import { visitDueDate } from "@/lib/checkups";
import type { SummaryEvent, Measurement } from "@/lib/visit-summary";
import { VisitSummaryView } from "./_components/visit-summary-view";
import type { QuestionRow } from "./_components/visit-questions";

/** A dose recorded during the window, with its display label resolved. */
export type GivenDose = {
  key: string;
  label: string;
  dose: string;
  givenOn: string;
};

/** The visit this summary is being prepared for, and what's due at it. */
export type NextVisitVM = {
  slug: string;
  label: string;
  dueISO: string;
  vaccines: Array<{ key: string; label: string; dose: string; given: boolean }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Code → display label for every vaccine in the reference schedule. */
const VACCINE_LABELS = new Map(
  WELL_VISITS.flatMap((v) => v.vaccines.map((x) => [x.code, x.label] as const)),
);

type ApptRow = {
  slug: string | null;
  title: string;
  scheduled_for: string;
  completed_at: string | null;
};

/**
 * Sensible default window: from the most recent visit that already happened,
 * to the next one coming up. Falls back to the AAP schedule when nothing has
 * been booked, and finally to a plain 30-day look-back.
 *
 * Resolved in *server* time, so it can land a day off for a user far from UTC.
 * That's fine — it only seeds the two date inputs, and every number on the
 * page is bucketed client-side in the viewer's own timezone.
 */
function defaultRange(
  appts: ApptRow[],
  birthDate: string | null,
  now: Date,
): { from: string; to: string; lastVisitLabel: string | null } {
  const today = dayKey(now);

  const past = appts
    .filter((a) => a.completed_at != null && dayKey(new Date(a.scheduled_for)) <= today)
    .sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for));
  const upcoming = appts
    .filter((a) => a.completed_at == null && dayKey(new Date(a.scheduled_for)) > today)
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));

  const from =
    past.length > 0
      ? dayKey(new Date(past[0].scheduled_for))
      : (birthDate ?? dayKey(new Date(now.getTime() - 30 * DAY_MS)));

  let to = upcoming.length > 0 ? dayKey(new Date(upcoming[0].scheduled_for)) : null;
  if (!to && birthDate) {
    const nextDue = WELL_VISITS.map((v) => visitDueDate(birthDate, v.ageMonths))
      .filter((d) => dayKey(d) > today)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (nextDue) to = dayKey(nextDue);
  }

  return {
    from,
    to: to ?? today,
    lastVisitLabel: past.length > 0 ? past[0].title : null,
  };
}

/**
 * The scheduled well-visit nearest the chosen end date — that's the one whose
 * vaccines are "due at this visit". A 21-day tolerance keeps it matching even
 * when the appointment was booked a couple of weeks off the ideal date.
 */
function matchWellVisit(
  birthDate: string | null,
  to: string,
): { slug: string; label: string; dueISO: string } | null {
  if (!birthDate) return null;
  const target = new Date(`${to}T00:00:00`).getTime();
  let best: { slug: string; label: string; dueISO: string; gap: number } | null =
    null;
  for (const v of WELL_VISITS) {
    const due = visitDueDate(birthDate, v.ageMonths);
    const gap = Math.abs(due.getTime() - target);
    if (gap <= 21 * DAY_MS && (best == null || gap < best.gap)) {
      best = {
        slug: v.slug,
        label: v.label,
        dueISO: due.toISOString(),
        gap,
      };
    }
  }
  return best ? { slug: best.slug, label: best.label, dueISO: best.dueISO } : null;
}

export default async function VisitSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ? { id: claims.claims.sub as string } : null;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, birth_date, baby_sex, pediatrician_name")
    .eq("id", user.id)
    .single();
  const coupleId = profile?.couple_id ?? null;
  const birthDate = profile?.birth_date ?? null;
  const babySex = (profile?.baby_sex ?? null) as "male" | "female" | null;

  const scope = <T extends { eq: (c: string, v: string) => T }>(q: T): T =>
    coupleId ? q.eq("couple_id", coupleId) : q.eq("user_id", user.id);

  const { data: apptData } = await scope(
    supabase
      .from("appointments")
      .select("slug, title, scheduled_for, completed_at")
      .order("scheduled_for", { ascending: false }),
  );
  const appts = (apptData ?? []) as ApptRow[];

  const now = new Date();
  const fallback = defaultRange(appts, birthDate, now);
  const sp = await searchParams;
  const fromParam = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  const toParam = Array.isArray(sp.to) ? sp.to[0] : sp.to;
  let from = isDateKey(fromParam) ? fromParam : fallback.from;
  let to = isDateKey(toParam) ? toParam : fallback.to;
  if (to < from) [from, to] = [to, from];

  // A day of buffer on each side: rows are UTC and the client buckets them in
  // local time, which can be up to ±14h away from the boundaries above.
  const sinceISO = new Date(
    new Date(`${from}T00:00:00Z`).getTime() - DAY_MS,
  ).toISOString();
  const untilISO = new Date(
    Math.min(now.getTime(), new Date(`${to}T00:00:00Z`).getTime()) + 2 * DAY_MS,
  ).toISOString();

  const eventsQuery = scope(
    supabase
      .from("baby_events")
      .select("kind, subtype, amount, unit, occurred_at, ended_at, notes")
      .gte("occurred_at", sinceISO)
      .lte("occurred_at", untilISO)
      .neq("kind", "kick")
      .order("occurred_at", { ascending: true }),
  );

  // Growth and vaccines are small and need history from *before* the window
  // (the baseline weigh-in, doses given earlier), so they're read in full.
  const growthQuery = scope(
    supabase
      .from("growth_measurements")
      .select("measured_on, weight_g, height_cm, head_cm")
      .order("measured_on", { ascending: true }),
  );
  const doseQuery = scope(
    supabase.from("vaccine_doses").select("vaccine, dose, given_on"),
  );
  const questionQuery = scope(
    supabase
      .from("visit_questions")
      .select("id, question, asked_at, created_at")
      .order("created_at", { ascending: true }),
  );

  const [
    { data: eventData },
    { data: growthData },
    { data: doseData },
    { data: questionData },
  ] = await Promise.all([eventsQuery, growthQuery, doseQuery, questionQuery]);

  const events = (eventData ?? []) as SummaryEvent[];
  const measurements = (growthData ?? []) as Measurement[];
  const doses = (doseData ?? []) as Array<{
    vaccine: string;
    dose: string;
    given_on: string;
  }>;
  const questions = (questionData ?? []) as QuestionRow[];

  const givenKeys = new Set(doses.map((d) => doseKey(d.vaccine, d.dose)));
  const givenInWindow: GivenDose[] = doses
    .filter((d) => d.given_on >= from && d.given_on <= to)
    .map((d) => ({
      key: doseKey(d.vaccine, d.dose),
      label: VACCINE_LABELS.get(d.vaccine) ?? d.vaccine,
      dose: d.dose,
      givenOn: d.given_on,
    }))
    .sort((a, b) => a.givenOn.localeCompare(b.givenOn));

  const matched = matchWellVisit(birthDate, to);
  const nextVisit: NextVisitVM | null = matched
    ? {
        ...matched,
        vaccines:
          WELL_VISITS.find((v) => v.slug === matched.slug)?.vaccines.map(
            (vac) => ({
              key: doseKey(vac.code, vac.dose),
              label: vac.label,
              dose: vac.dose,
              given: givenKeys.has(doseKey(vac.code, vac.dose)),
            }),
          ) ?? [],
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-16 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <PageHero
          tool="checkups"
          icon={ClipboardList}
          eyebrow="Visit summary"
          title="Walk in with the answers."
          subtitle="Everything since the last checkup, in the numbers your pediatrician will ask for."
        />
        <Link
          href="/checkups"
          className="mb-6 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Back to checkups
        </Link>
      </div>

      <VisitSummaryView
        from={from}
        to={to}
        birthDate={birthDate}
        babySex={babySex}
        pediatrician={profile?.pediatrician_name ?? null}
        lastVisitLabel={
          isDateKey(fromParam) ? null : fallback.lastVisitLabel
        }
        events={events}
        measurements={measurements}
        givenInWindow={givenInWindow}
        nextVisit={nextVisit}
        questions={questions}
      />
    </div>
  );
}
