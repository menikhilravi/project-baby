import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { ageInDays, diaperGuidance, tallyDiapers } from "@/lib/newborn-health";
import {
  defaultFeedIntervalMin,
  feedDueStatus,
  medianFeedIntervalMin,
} from "@/lib/care-schedule";
import {
  DEFAULT_GRACE_MIN,
  dueSlots,
  matchDoses,
  scheduleMinutes,
  scheduleName,
  toHhMm,
  type MedScheduleRow,
} from "@/lib/med-schedule";

/**
 * Cron-fired endpoint: opt-in feed, diaper & medicine reminders, couple-wide.
 *
 *   Feed   — nudge once when the gap since the last feed passes the couple's
 *            adaptive interval (median of recent gaps, or a newborn default).
 *   Diaper — nudge once per local day, after mid-afternoon, if the day's
 *            wet/dirty output is still below the age-appropriate target.
 *   Med    — nudge once per scheduled dose time (med_schedules, migration
 *            0032) that has come due and hasn't been logged. These ignore
 *            quiet hours: the parent chose the time, so a 10pm dose still
 *            gets its reminder.
 *
 * De-dup lives in `care_reminder_state` so a run every ~20m never double-sends:
 * a feed reminder re-arms when a newer feed is logged; a diaper reminder fires
 * at most once per local date; a med reminder at most once per slot per date.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`. Scheduled via Supabase pg_cron
 * (see migration 0028) or the care-reminder GitHub Actions workflow.
 * Idempotent and safe to re-trigger.
 */
export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string | null;
};

type Profile = {
  id: string;
  couple_id: string | null;
  birth_date: string | null;
  feed_reminders: boolean;
  diaper_reminders: boolean;
  feed_interval_min: number | null;
};

type Group = {
  coupleKey: string;
  coupleId: string | null;
  userIds: string[];
  subs: Sub[];
  birthDate: string | null;
  feedOptIn: boolean;
  diaperOptIn: boolean;
  intervalOverride: number | null;
  /** Representative IANA tz for quiet-hours + local-day math. */
  tz: string | null;
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  const [quietStart, quietEnd] = parsePair(
    process.env.CARE_REMINDER_WINDOW ?? "6,22",
    6,
    22,
  );
  // Diaper nudges only make sense once the day has had time to accumulate.
  const diaperHour = Number(process.env.CARE_DIAPER_HOUR ?? "16");

  const { data: allSubs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, timezone");
  if (subErr) return Response.json({ error: subErr.message }, { status: 500 });
  if (!allSubs || allSubs.length === 0) {
    return Response.json({ sent: 0, groups: 0 });
  }

  const userIds = [...new Set(allSubs.map((s) => s.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, couple_id, birth_date, feed_reminders, diaper_reminders, feed_interval_min",
    )
    .in("id", userIds);
  const profileById = new Map<string, Profile>(
    (profiles ?? []).map((p) => [p.id, p as Profile]),
  );

  const groups = buildGroups(allSubs as Sub[], profileById);

  // Preload send-state so we don't query per group.
  const { data: stateRows } = await supabase
    .from("care_reminder_state")
    .select("couple_key, kind, last_ref");
  const stateRef = new Map<string, string | null>(
    (stateRows ?? []).map((r) => [`${r.couple_key}|${r.kind}`, r.last_ref]),
  );

  // Active dose schedules, bucketed onto the same couple/solo key as `groups`.
  // Absent (null) until migration 0032 is applied — meds just stay quiet.
  const { data: scheduleRows } = await supabase
    .from("med_schedules")
    .select("id, user_id, couple_id, subtype, label, times, amount, unit, active")
    .eq("active", true);
  const schedulesByKey = new Map<string, MedScheduleRow[]>();
  for (const s of scheduleRows ?? []) {
    const key = s.couple_id ?? `user:${s.user_id}`;
    const list = schedulesByKey.get(key) ?? [];
    list.push(s as MedScheduleRow);
    schedulesByKey.set(key, list);
  }

  const medGraceMin = Number(process.env.CARE_MED_GRACE_MIN ?? DEFAULT_GRACE_MIN);

  let feedSent = 0;
  let diaperSent = 0;
  let medSent = 0;
  let skippedQuiet = 0;
  let pruned = 0;

  for (const g of groups) {
    const schedules = schedulesByKey.get(g.coupleKey) ?? [];
    if (!g.feedOptIn && !g.diaperOptIn && schedules.length === 0) continue;

    const localHour = g.tz ? currentHourInTz(g.tz) : now.getHours();
    // Quiet hours gate feed & diaper only; scheduled doses opt out by design.
    const quiet =
      localHour !== null && (localHour < quietStart || localHour >= quietEnd);
    if (quiet) skippedQuiet++;

    // --- Feed ---
    if (g.feedOptIn && !quiet) {
      const feeds = await fetchEvents(supabase, g, "feed", 48);
      const last = feeds[0];
      if (last) {
        const interval =
          g.intervalOverride ??
          medianFeedIntervalMin(feeds) ??
          defaultFeedIntervalMin(ageInDays(g.birthDate, now));
        const status = feedDueStatus(last.occurred_at, interval, now);
        const alreadyForThisGap =
          stateRef.get(`${g.coupleKey}|feed`) === last.occurred_at;
        if (status.overdueMin >= 0 && !alreadyForThisGap) {
          const p = await pushToGroup(supabase, g, {
            title: "Feeding time?",
            body: `~${sinceLabel(last.occurred_at, now)} since the last feed.`,
            url: "/log/feed",
            tag: "care-feed",
          });
          pruned += p.pruned;
          if (p.sent > 0) {
            feedSent++;
            await upsertState(supabase, g.coupleKey, "feed", last.occurred_at, now);
          }
        }
      }
    }

    // --- Diaper ---
    if (g.diaperOptIn && !quiet && localHour !== null && localHour >= diaperHour) {
      const localDate = g.tz ? localDateInTz(g.tz, now) : localDateOf(now);
      const alreadyToday = stateRef.get(`${g.coupleKey}|diaper`) === localDate;
      if (!alreadyToday) {
        const diapers = await fetchEvents(supabase, g, "diaper", 30);
        const todays = diapers.filter(
          (d) =>
            (g.tz ? localDateInTz(g.tz, new Date(d.occurred_at)) : localDateOf(new Date(d.occurred_at))) ===
            localDate,
        );
        const counts = tallyDiapers(todays);
        const guidance = diaperGuidance(counts, g.birthDate, now);
        if (guidance.status === "building") {
          const p = await pushToGroup(supabase, g, {
            title: "Diaper check",
            body: `${guidance.wet} wet / ${guidance.dirty} dirty so far — aim for ${guidance.targetWet}/${guidance.targetDirty} today.`,
            url: "/log/diaper",
            tag: "care-diaper",
          });
          pruned += p.pruned;
          if (p.sent > 0) {
            diaperSent++;
            await upsertState(supabase, g.coupleKey, "diaper", localDate, now);
          }
        }
      }
    }

    // --- Scheduled medicine ---
    if (schedules.length > 0) {
      const localDate = g.tz ? localDateInTz(g.tz, now) : localDateOf(now);
      const nowMin = localMinutesInTz(g.tz, now);
      // One read covers every schedule in this group.
      const meds = await fetchEvents(supabase, g, "med", 36);
      const todaysMeds = meds.filter(
        (m) =>
          (g.tz
            ? localDateInTz(g.tz, new Date(m.occurred_at))
            : localDateOf(new Date(m.occurred_at))) === localDate,
      );

      for (const sched of schedules) {
        const slots = scheduleMinutes(sched.times);
        if (slots.length === 0) continue;

        const doseMins = todaysMeds
          .filter((m) => m.subtype === sched.subtype)
          .map((m) => localMinutesInTz(g.tz, new Date(m.occurred_at)));
        const due = dueSlots(
          matchDoses(slots, doseMins),
          nowMin,
          medGraceMin,
        );
        // Only the earliest outstanding slot nudges — one push, not a pile.
        const slot = due[0];
        if (!slot) continue;

        const stateKey = `${g.coupleKey}|med:${sched.id}`;
        const ref = `${localDate}T${toHhMm(slot.slotMin)}`;
        if (stateRef.get(stateKey) === ref) continue;

        const name = scheduleName(sched);
        const dose =
          sched.amount != null ? ` ${sched.amount}${sched.unit ?? ""}` : "";
        const p = await pushToGroup(supabase, g, {
          title: `${name} due`,
          body: `Scheduled for ${formatSlotLabel(slot.slotMin)}${dose}. Tap to log it.`,
          url: "/log/med",
          tag: `care-med-${sched.id}`,
        });
        pruned += p.pruned;
        if (p.sent > 0) {
          medSent++;
          stateRef.set(stateKey, ref);
          await upsertState(supabase, g.coupleKey, `med:${sched.id}`, ref, now);
        }
      }
    }
  }

  return Response.json({
    groups: groups.length,
    feed_sent: feedSent,
    diaper_sent: diaperSent,
    med_sent: medSent,
    skipped_quiet: skippedQuiet,
    pruned,
    quiet_window: `${quietStart}-${quietEnd}`,
  });
}

// --- helpers ---------------------------------------------------------------

function buildGroups(
  subs: Sub[],
  profileById: Map<string, Profile>,
): Group[] {
  const byKey = new Map<string, Group>();
  for (const sub of subs) {
    const profile = profileById.get(sub.user_id);
    const coupleId = profile?.couple_id ?? null;
    const coupleKey = coupleId ?? `user:${sub.user_id}`;
    let g = byKey.get(coupleKey);
    if (!g) {
      g = {
        coupleKey,
        coupleId,
        userIds: [],
        subs: [],
        birthDate: null,
        feedOptIn: false,
        diaperOptIn: false,
        intervalOverride: null,
        tz: null,
      };
      byKey.set(coupleKey, g);
    }
    g.subs.push(sub);
    if (!g.userIds.includes(sub.user_id)) g.userIds.push(sub.user_id);
    if (sub.timezone && !g.tz) g.tz = sub.timezone;
    if (profile) {
      if (profile.feed_reminders) g.feedOptIn = true;
      if (profile.diaper_reminders) g.diaperOptIn = true;
      if (profile.birth_date && !g.birthDate) g.birthDate = profile.birth_date;
      if (profile.feed_interval_min != null && g.intervalOverride == null) {
        g.intervalOverride = profile.feed_interval_min;
      }
    }
  }
  return [...byKey.values()];
}

type EventRow = { occurred_at: string; subtype: string | null };

async function fetchEvents(
  supabase: ReturnType<typeof createServiceClient>,
  g: Group,
  kind: "feed" | "diaper" | "med",
  hours: number,
): Promise<EventRow[]> {
  const since = new Date(Date.now() - hours * 60 * 60_000).toISOString();
  let q = supabase
    .from("baby_events")
    .select("occurred_at, subtype")
    .eq("kind", kind)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });
  q = g.coupleId
    ? q.eq("couple_id", g.coupleId)
    : q.in("user_id", g.userIds);
  const { data } = await q;
  return (data ?? []) as EventRow[];
}

async function pushToGroup(
  supabase: ReturnType<typeof createServiceClient>,
  g: Group,
  payload: { title: string; body: string; url: string; tag: string },
): Promise<{ sent: number; pruned: number }> {
  let sent = 0;
  let pruned = 0;
  for (const s of g.subs) {
    const result = await sendPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      payload,
    );
    if (result.ok) {
      sent++;
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", s.id);
    } else if (result.gone) {
      pruned++;
      await supabase.from("push_subscriptions").delete().eq("id", s.id);
    } else {
      console.error("[care-reminder] send failed", {
        endpoint: s.endpoint.slice(0, 60),
        status: result.status,
        error: result.error,
      });
    }
  }
  return { sent, pruned };
}

async function upsertState(
  supabase: ReturnType<typeof createServiceClient>,
  coupleKey: string,
  /** 'feed' | 'diaper' | 'med:<schedule_id>' — see migration 0032. */
  kind: string,
  lastRef: string,
  now: Date,
) {
  await supabase.from("care_reminder_state").upsert(
    {
      couple_key: coupleKey,
      kind,
      last_ref: lastRef,
      last_sent_at: now.toISOString(),
    },
    { onConflict: "couple_key,kind" },
  );
}

/** "3h" / "2h 40m" between an ISO time and now. */
function sinceLabel(iso: string, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function parsePair(raw: string, dA: number, dB: number): [number, number] {
  const [a, b] = raw.split(",").map((s) => Number(s.trim()));
  return [Number.isFinite(a) ? a : dA, Number.isFinite(b) ? b : dB];
}

function localDateOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Local YYYY-MM-DD in the given IANA timezone (en-CA yields ISO order).
function localDateInTz(tz: string, d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return localDateOf(d);
  }
}

/**
 * Minutes past local midnight in `tz`, for matching a wall-clock dose schedule.
 * Falls back to the server's own clock when the tz is missing or unrecognized —
 * same "rather send than silently stop" bias as the kick reminder.
 */
function localMinutesInTz(tz: string | null, d: Date): number {
  const serverMin = d.getHours() * 60 + d.getMinutes();
  if (!tz) return serverMin;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return serverMin;
    return (h % 24) * 60 + m;
  } catch {
    return serverMin;
  }
}

/** "9:00 AM" for a minute-of-day, in the app's default (server) locale. */
function formatSlotLabel(minutes: number): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Current hour (0-23) in the given IANA timezone, or null if unrecognized.
function currentHourInTz(tz: string): number | null {
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const hour = parseInt(hourStr, 10);
    return Number.isFinite(hour) ? hour % 24 : null;
  } catch {
    return null;
  }
}
