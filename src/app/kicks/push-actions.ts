"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";

type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function subscribeToPush(
  sub: SerializedSubscription,
  timezone?: string | null,
) {
  const { supabase, user } = await requireUser();
  const h = await headers();
  const ua = h.get("user-agent");
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: ua,
        timezone: timezone ?? null,
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) {
    // Surface the real Supabase error so the client banner shows something
    // useful (e.g. "relation push_subscriptions does not exist" when the
    // migration hasn't been applied yet).
    console.error("[push] upsert failed", error);
    throw new Error(`push_subscriptions upsert failed: ${error.message}`);
  }
}

export async function unsubscribeFromPush(endpoint: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export type TestPushResult = {
  sent: number;
  pruned: number;
  total: number;
  errors: string[];
};

/**
 * Fire a test notification to every device this user has subscribed.
 * Returns per-failure detail so the UI can show exactly why a send
 * failed (most common: VAPID key mismatch between client/server, which
 * the push service surfaces as 403/410).
 */
export async function sendTestPush(): Promise<TestPushResult> {
  const { supabase, user } = await requireUser();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  let sent = 0;
  let pruned = 0;
  const errors: string[] = [];
  for (const s of subs ?? []) {
    const result = await sendPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      {
        title: "Kick reminder test",
        body: "Reminders are working. We'll nudge you every couple of hours.",
        url: "/kicks",
        tag: "kick-test",
      },
    );
    if (result.ok) {
      sent++;
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", s.id);
    } else {
      errors.push(
        `${result.status ?? "?"}: ${result.error.slice(0, 200)}`,
      );
      // Only prune on a real gone (410). Some push services return 404 on
      // misconfigured VAPID before the endpoint is actually invalidated, so
      // don't auto-delete unless we're sure.
      if (result.status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
        pruned++;
      }
    }
  }
  return { sent, pruned, total: subs?.length ?? 0, errors };
}
