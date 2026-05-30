import "server-only";
import webpush from "web-push";

/**
 * Initialize the web-push library with VAPID details once per process.
 * VAPID keys are required by the Web Push protocol so the push server
 * (FCM / Mozilla autopush / etc.) can verify our identity. Generate with:
 *
 *   npx web-push generate-vapid-keys
 *
 * Then add to env:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_CONTACT=mailto:you@example.com
 */
let initialized = false;
function ensureVapid() {
  if (initialized) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:admin@example.com";
  if (!pub || !priv) {
    throw new Error(
      "Missing VAPID env vars. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    );
  }
  webpush.setVapidDetails(contact, pub, priv);
  initialized = true;
}

export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; gone: boolean; status?: number; error: string };

export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<SendResult> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    const status = err.statusCode;
    // 404/410 = subscription expired or unsubscribed → caller should delete row.
    const gone = status === 404 || status === 410;
    return {
      ok: false,
      gone,
      status,
      error: err.body || err.message || String(e),
    };
  }
}
