"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { feverAlert } from "@/lib/newborn-health";

export type LatestTemp = {
  amount: number;
  unit: "f" | "c";
  occurred_at: string;
} | null;

/**
 * Surfaces the most recent temperature only when it needs attention. A normal
 * reading renders nothing — Today stays calm. A fever under 3 months, or any
 * low reading, renders the urgent (destructive) treatment; a milder fever
 * renders an amber heads-up. Not medical advice; it points to the pediatrician.
 */
export function FeverAlertCard({
  reading,
  birthDate,
}: {
  reading: LatestTemp;
  birthDate: string | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!now || !reading) return null;

  // Stale readings (older than 24h) don't warrant a standing alert.
  const ageMs = now.getTime() - new Date(reading.occurred_at).getTime();
  if (ageMs > 24 * 60 * 60 * 1000) return null;

  const alert = feverAlert(reading, birthDate, now);
  if (alert.status === "normal" || alert.status === "elevated") return null;

  const headline =
    alert.status === "low"
      ? "Low temperature"
      : alert.underThreeMonths
        ? "Fever — under 3 months"
        : "Fever";
  const message =
    alert.status === "low"
      ? "This is low for a baby. Call your pediatrician."
      : alert.underThreeMonths
        ? "A fever this age can be the only sign of infection. Call your pediatrician now, or go to the ER."
        : "Keep monitoring and call your pediatrician if it climbs or your baby seems unwell.";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        alert.urgent
          ? "border-destructive/40 bg-destructive/10"
          : "border-amber-500/40 bg-amber-500/10",
      )}
    >
      <div className="flex items-center gap-2">
        {alert.urgent ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Thermometer className="h-4 w-4 text-amber-600" />
        )}
        <p
          className={cn(
            "text-sm font-semibold flex-1",
            alert.urgent ? "text-destructive" : "text-amber-700",
          )}
        >
          {headline} · {alert.fahrenheit}°F
        </p>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {relative(ageMs)}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-foreground/90">{message}</p>
    </div>
  );
}

function relative(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
