"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from "../push-actions";

/**
 * Push notification opt-in card. Handles browser-side service worker
 * registration, subscription lifecycle, and an iOS install hint for users
 * who haven't added the app to their home screen yet (required for push
 * to work in iOS Safari).
 */
export function KickReminders() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [busy, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  // Browser feature/platform detection has to happen client-side; the
  // setState-in-effect lint rule doesn't apply cleanly to one-shot env
  // reads from window/navigator.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        // @ts-expect-error vendor-prefixed only
        !window.MSStream,
    );
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      (async () => {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });
          const existing = await reg.pushManager.getSubscription();
          setSubscription(existing);
        } catch (e) {
          console.error("[push] sw register failed", e);
        }
      })();
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubscribe() {
    setStatus(null);
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY env var.");
      return;
    }
    startTransition(async () => {
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          setStatus("Permission denied — enable notifications in browser settings.");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        setSubscription(sub);
        const serialized = sub.toJSON() as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
          throw new Error("Browser returned an incomplete subscription");
        }
        // Capture the device's IANA timezone so the cron can respect
        // quiet hours (6am–10pm local). Falls back to null if unavailable.
        let tz: string | null = null;
        try {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
        } catch {
          tz = null;
        }
        await subscribeToPush(
          {
            endpoint: serialized.endpoint,
            keys: {
              p256dh: serialized.keys.p256dh,
              auth: serialized.keys.auth,
            },
          },
          tz,
        );
        setStatus("Subscribed. We'll send a test now…");
        const result = await sendTestPush();
        if (result.sent > 0) {
          setStatus("Reminders on — test sent.");
        } else if (result.errors.length > 0) {
          setStatus(`Subscribed, but test send failed: ${result.errors[0]}`);
        } else {
          setStatus("Subscribed, but no devices received a test push.");
        }
      } catch (e) {
        console.error("[push] subscribe failed", e);
        setStatus(e instanceof Error ? e.message : "Subscribe failed");
      }
    });
  }

  async function handleUnsubscribe() {
    if (!subscription) return;
    setStatus(null);
    startTransition(async () => {
      try {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        setSubscription(null);
        await unsubscribeFromPush(endpoint);
        setStatus("Reminders off.");
      } catch (e) {
        console.error("[push] unsubscribe failed", e);
        setStatus(e instanceof Error ? e.message : "Unsubscribe failed");
      }
    });
  }

  async function handleTest() {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await sendTestPush();
        if (result.sent > 0) {
          setStatus(
            `Sent to ${result.sent} device${result.sent === 1 ? "" : "s"}.`,
          );
        } else if (result.total === 0) {
          setStatus(
            "No subscriptions in the database for this account. Try Unsubscribe → Subscribe to resync.",
          );
        } else if (result.errors.length > 0) {
          setStatus(`Send failed: ${result.errors[0]}`);
        } else {
          setStatus("No active subscriptions reachable.");
        }
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Test send failed");
      }
    });
  }

  if (!isSupported) {
    // Older browsers + iOS Safari without home-screen install
    if (isIOS && !isStandalone) {
      return <IOSInstallHint />;
    }
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
        Push notifications aren&apos;t supported in this browser. Try Chrome,
        Edge, or Firefox.
      </div>
    );
  }

  const subscribed = !!subscription && permission === "granted";

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid place-items-center h-9 w-9 rounded-xl shrink-0",
            subscribed
              ? "bg-kicks-soft text-kicks"
              : "bg-muted text-muted-foreground",
          )}
        >
          {subscribed ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-tight">
            {subscribed ? "Kick reminders are on" : "Get gentle kick reminders"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subscribed
              ? "We'll nudge this device every 2h between 6am–10pm if no kicks were logged in the last 2h."
              : "We'll send a push every 2h between 6am–10pm if no kicks were logged in the last 2h."}
          </p>
          {isIOS && !isStandalone ? (
            <div className="mt-3 rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground">
              Heads up — to get push on iOS, add this app to your home screen
              first (Share <Share className="inline h-3 w-3 mb-0.5" /> →{" "}
              <span className="whitespace-nowrap">
                Add to Home Screen <Plus className="inline h-3 w-3 mb-0.5" />
              </span>
              ), then open it from there and tap Subscribe.
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {subscribed ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTest}
                  disabled={busy}
                  className="h-8 text-xs"
                >
                  Send test
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleUnsubscribe}
                  disabled={busy}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  Turn off
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubscribe}
                disabled={busy}
                className="h-8 text-xs bg-kicks hover:bg-kicks/90 text-white"
              >
                {busy ? "Subscribing…" : "Subscribe this device"}
              </Button>
            )}
            {status ? (
              <span className="text-[11px] text-muted-foreground">
                {status}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function IOSInstallHint() {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-medium leading-tight">
        Install to get reminders
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        iOS only supports push for installed PWAs. Tap the share button{" "}
        <Share className="inline h-3 w-3 mb-0.5" />, then{" "}
        <span className="whitespace-nowrap">
          Add to Home Screen <Plus className="inline h-3 w-3 mb-0.5" />
        </span>
        . Open the app from your home screen and come back to subscribe.
      </p>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
