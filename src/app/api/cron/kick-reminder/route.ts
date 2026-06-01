import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";

/**
 * Cron-fired endpoint: for every mom-role user with an active push
 * subscription, send a gentle reminder if she hasn't logged a kick within
 * the last KICK_REMINDER_HOURS (default 3) hours.
 *
 * Auth: caller must present `Authorization: Bearer ${CRON_SECRET}`. The
 * GitHub Actions workflow stores CRON_SECRET as a repo secret and sends
 * the same value with each request.
 *
 * The endpoint is intentionally idempotent — runs are cheap and safe to
 * re-trigger. Push subscriptions that come back 404/410 are deleted.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const thresholdHours = Number(process.env.KICK_REMINDER_HOURS ?? "2");
  const cutoff = new Date(
    Date.now() - thresholdHours * 60 * 60_000,
  ).toISOString();

  const supabase = createServiceClient();

  // Quiet hours: local 6am (inclusive) – 10pm (exclusive). Subscribers
  // outside this window get skipped. Tunable via env, comma-separated.
  const [quietStartRaw, quietEndRaw] = (
    process.env.KICK_REMINDER_HOURS_WINDOW ?? "6,22"
  )
    .split(",")
    .map((s) => Number(s.trim()));
  const quietStart = Number.isFinite(quietStartRaw) ? quietStartRaw : 6;
  const quietEnd = Number.isFinite(quietEndRaw) ? quietEndRaw : 22;

  // 1. Pull all subscriptions, joined with user role so we only ping moms.
  const { data: allSubs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, timezone");
  if (subErr) {
    return Response.json({ error: subErr.message }, { status: 500 });
  }

  const userIds = [...new Set((allSubs ?? []).map((s) => s.user_id))];
  if (userIds.length === 0) {
    return Response.json({ sent: 0, skipped: 0, pruned: 0, total: 0 });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", userIds);
  const momUserIds = new Set(
    (profiles ?? []).filter((p) => p.role === "mom").map((p) => p.id),
  );

  const momSubs = (allSubs ?? []).filter((s) => momUserIds.has(s.user_id));

  let sent = 0;
  let skipped = 0;
  let skippedQuiet = 0;
  let pruned = 0;

  for (const sub of momSubs) {
    // Quiet-hours check. If the subscription has no timezone (legacy row),
    // we err on the side of sending so we don't silently stop reminders.
    if (sub.timezone) {
      const localHour = currentHourInTz(sub.timezone);
      if (localHour !== null && (localHour < quietStart || localHour >= quietEnd)) {
        skippedQuiet++;
        continue;
      }
    }
    // Last kick for this user (only mom can log kicks, so user_id is enough).
    const { data: lastKick } = await supabase
      .from("baby_events")
      .select("occurred_at")
      .eq("user_id", sub.user_id)
      .eq("kind", "kick")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastTs = lastKick?.occurred_at ?? null;
    if (lastTs && lastTs > cutoff) {
      skipped++;
      continue;
    }

    const hoursSince = lastTs
      ? Math.max(
          1,
          Math.round((Date.now() - new Date(lastTs).getTime()) / 3_600_000),
        )
      : null;
    const body = hoursSince
      ? `No kicks logged in ${hoursSince}h. Tap to check in.`
      : "Haven't seen any kicks today. Time to count?";

    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      {
        title: "Time to count kicks",
        body,
        url: "/kicks",
        tag: "kick-reminder",
      },
    );

    if (result.ok) {
      sent++;
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } else if (result.gone) {
      pruned++;
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error("[kick-reminder] send failed", {
        endpoint: sub.endpoint.slice(0, 60),
        status: result.status,
        error: result.error,
      });
    }
  }

  return Response.json({
    sent,
    skipped,
    skipped_quiet: skippedQuiet,
    pruned,
    total: momSubs.length,
    threshold_hours: thresholdHours,
    quiet_window: `${quietStart}-${quietEnd}`,
  });
}

// Returns the current hour (0-23) in the given IANA timezone, or null if
// the TZ string isn't recognized by Intl.
function currentHourInTz(tz: string): number | null {
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const hour = parseInt(hourStr, 10);
    return Number.isFinite(hour) ? hour : null;
  } catch {
    return null;
  }
}
