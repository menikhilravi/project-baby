"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Droplets, Plus, Share, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from "@/app/kicks/push-actions";
import { setCareReminderPrefs } from "../actions";

/**
 * Opt-in feed & diaper reminders. Handles the per-device push subscription
 * (service worker + PushManager) and the couple-wide feed/diaper toggles that
 * the /api/cron/care-reminder job reads. Mirrors the kick-reminder flow,
 * including the iOS "install to home screen first" hint.
 */
export function CareReminders({
  initialFeed,
  initialDiaper,
  initialIntervalMin,
}: {
  initialFeed: boolean;
  initialDiaper: boolean;
  initialIntervalMin: number | null;
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const [feed, setFeed] = useState(initialFeed);
  const [diaper, setDiaper] = useState(initialDiaper);
  const [interval, setIntervalStr] = useState(
    initialIntervalMin != null ? String(initialIntervalMin) : "",
  );
  const [savingPrefs, startPrefs] = useTransition();

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

  const savePrefs = (next: {
    feed: boolean;
    diaper: boolean;
    intervalStr: string;
  }) => {
    const parsed = next.intervalStr.trim() === "" ? null : Number(next.intervalStr);
    startPrefs(async () => {
      try {
        await setCareReminderPrefs({
          feed: next.feed,
          diaper: next.diaper,
          feedIntervalMin: parsed,
        });
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Couldn't save preferences");
      }
    });
  };

  const toggleFeed = () => {
    const v = !feed;
    setFeed(v);
    savePrefs({ feed: v, diaper, intervalStr: interval });
  };
  const toggleDiaper = () => {
    const v = !diaper;
    setDiaper(v);
    savePrefs({ feed, diaper: v, intervalStr: interval });
  };
  const commitInterval = () =>
    savePrefs({ feed, diaper, intervalStr: interval });

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
        const result = await sendTestPush();
        setStatus(
          result.sent > 0
            ? "This device is subscribed — test sent."
            : result.errors[0]
              ? `Subscribed, but test failed: ${result.errors[0]}`
              : "Subscribed, but no device received a test.",
        );
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
        setStatus("This device unsubscribed.");
      } catch (e) {
        console.error("[push] unsubscribe failed", e);
        setStatus(e instanceof Error ? e.message : "Unsubscribe failed");
      }
    });
  }

  const subscribed = !!subscription && permission === "granted";

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid place-items-center h-9 w-9 rounded-xl shrink-0",
            subscribed ? "bg-logger-soft text-logger" : "bg-muted text-muted-foreground",
          )}
        >
          {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-tight">Care reminders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gentle nudges between 6am–10pm when a feed is overdue or the day&apos;s
            diapers are running low. Shared across you and your partner.
          </p>
        </div>
      </div>

      {/* Type toggles */}
      <div className="space-y-2">
        <ToggleRow
          icon={<Utensils className="h-4 w-4 text-amber-500" />}
          label="Feed reminders"
          hint="Adapts to your baby's recent feeding rhythm."
          on={feed}
          onToggle={toggleFeed}
          disabled={savingPrefs}
        />
        {feed ? (
          <div className="flex items-center gap-2 pl-11">
            <label className="text-xs text-muted-foreground">Every</label>
            <Input
              type="number"
              inputMode="numeric"
              min={30}
              value={interval}
              onChange={(e) => setIntervalStr(e.target.value)}
              onBlur={commitInterval}
              placeholder="auto"
              className="h-7 w-20 rounded-lg"
            />
            <span className="text-xs text-muted-foreground">
              min (blank = auto)
            </span>
          </div>
        ) : null}
        <ToggleRow
          icon={<Droplets className="h-4 w-4 text-sky-500" />}
          label="Diaper reminders"
          hint="A once-a-day check if output is below target."
          on={diaper}
          onToggle={toggleDiaper}
          disabled={savingPrefs}
        />
      </div>

      {/* Device subscription */}
      {!isSupported ? (
        isIOS && !isStandalone ? (
          <IOSInstallHint />
        ) : (
          <p className="text-xs text-muted-foreground">
            Push isn&apos;t supported in this browser. Try Chrome, Edge, or Firefox.
          </p>
        )
      ) : (
        <div className="border-t border-border pt-3">
          {isIOS && !isStandalone ? (
            <div className="mb-3 rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground">
              To get push on iOS, add this app to your home screen first (Share{" "}
              <Share className="inline h-3 w-3 mb-0.5" /> → Add to Home Screen{" "}
              <Plus className="inline h-3 w-3 mb-0.5" />), open it from there, then
              subscribe.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {subscribed ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleUnsubscribe}
                disabled={busy}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                Unsubscribe this device
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubscribe}
                disabled={busy}
                className="h-8 text-xs bg-logger hover:bg-logger/90 text-white"
              >
                {busy ? "Subscribing…" : "Subscribe this device"}
              </Button>
            )}
            {status ? (
              <span className="text-[11px] text-muted-foreground">{status}</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  on,
  onToggle,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          on ? "bg-logger" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function IOSInstallHint() {
  return (
    <p className="text-xs text-muted-foreground">
      iOS only supports push for installed apps. Tap Share{" "}
      <Share className="inline h-3 w-3 mb-0.5" /> → Add to Home Screen{" "}
      <Plus className="inline h-3 w-3 mb-0.5" />, then open the app from your home
      screen and come back to subscribe.
    </p>
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
