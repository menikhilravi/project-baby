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

export async function subscribeToPush(sub: SerializedSubscription) {
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
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) throw new Error(error.message);
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

/**
 * Fire a test notification to every device this user has subscribed.
 * Lets the user verify the wiring works without waiting two hours for
 * the cron job. Drops any subscriptions that come back as gone.
 */
export async function sendTestPush(): Promise<{ sent: number; pruned: number }> {
  const { supabase, user } = await requireUser();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  let sent = 0;
  let pruned = 0;
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
    } else if (result.gone) {
      await supabase.from("push_subscriptions").delete().eq("id", s.id);
      pruned++;
    }
  }
  return { sent, pruned };
}
