"use client";

import { Sun } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatClockTime, formatSpan } from "@/lib/time-format";
import { Pressable } from "@/components/ui/pressable";
import { BabyMascot } from "@/components/mascot/baby-mascot";
import { NightSky } from "@/components/mascot/night-sky";
import { useQuickLog } from "./use-quick-log";
import { useTimeZone } from "@/components/providers/time-zone";

/** The baby is asleep: a starry card with the running time and a Wake button. */
export function SleepTimer({ startedAt, serverNow }: { startedAt: string; serverNow?: number }) {
  const { toggleSleep } = useQuickLog();
  const { tz, ready } = useTimeZone();
  const tick = useNow(60_000);
  const now = tick || serverNow || new Date(startedAt).getTime();
  const elapsed = now - new Date(startedAt).getTime();

  return (
    <section
      aria-label="Baby is sleeping"
      className="relative isolate overflow-hidden rounded-card p-5 text-[oklch(0.95_0.02_90)] shadow-pop"
    >
      <NightSky className="-z-10" />
      <div className="flex items-center gap-4">
        <BabyMascot mood="sleeping" size={76} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">
            {ready ? `Sleeping since ${formatClockTime(startedAt, tz)}` : "Sleeping"}
          </p>
          <p className="font-display text-4xl font-semibold nums leading-tight">{formatSpan(elapsed)}</p>
        </div>
      </div>
      <Pressable
        onClick={(e) => void toggleSleep(e.currentTarget)}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[oklch(0.95_0.04_90)] text-base font-bold text-[oklch(0.25_0.05_280)] shadow-squish"
      >
        <Sun className="h-5 w-5" />
        Baby&apos;s awake
      </Pressable>
    </section>
  );
}
