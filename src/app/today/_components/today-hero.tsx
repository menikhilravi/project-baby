"use client";

import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";
import { BabyMascot, type MascotMood } from "@/components/mascot/baby-mascot";
import { NightSky } from "@/components/mascot/night-sky";
import { useBaby } from "@/components/providers/baby-context";
import { formatBabyAge } from "@/lib/baby-age";
import { formatDayLabel, hourIn } from "@/lib/time-format";
import { useTimeZone } from "@/components/providers/time-zone";

function greeting(hour: number, sleeping: boolean): string {
  if (sleeping) return "Shh… baby's sleeping";
  if (hour >= 22 || hour < 5) return "Night shift, you've got this";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The big friendly hello. The mascot mirrors what's actually happening:
 * asleep (with a night sky), feeding, a little peckish when a feed is well
 * overdue, otherwise just happy to see you.
 */
export function TodayHero({ now, mood }: { now: number; mood: MascotMood }) {
  const baby = useBaby();
  const { tz, ready } = useTimeZone();
  const date = new Date(now);
  const sleeping = mood === "sleeping";
  // Without a known time zone (first visit, still hydrating) stay neutral.
  const age = ready ? formatBabyAge(baby.birthDate, date, tz) : null;
  const dayLabel = ready ? formatDayLabel(date, tz) : "Today";
  const hello = ready ? greeting(hourIn(date, tz), sleeping) : sleeping ? greeting(12, true) : "Hello there";

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[2rem] px-5 py-5 shadow-pop ring-1 transition-colors duration-700",
        sleeping
          ? "text-[oklch(0.95_0.02_90)] ring-white/10"
          : "bg-[linear-gradient(135deg,var(--accent-baby-soft),var(--card)_70%)] ring-border/60",
      )}
    >
      <AnimatePresence>
        {sleeping ? (
          <m.div key="sky" className="absolute inset-0 -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NightSky />
          </m.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn("text-xs font-bold uppercase tracking-[0.14em]", sleeping ? "opacity-70" : "text-accent-baby-strong")}
          >
            {dayLabel}
          </p>
          <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-[1.1] text-balance">
            {hello}
          </h1>
          {age ? (
            <p className={cn("mt-1.5 text-sm font-semibold", sleeping ? "opacity-80" : "text-muted-foreground")}>
              {age.endsWith(" old") ? `${baby.name ?? "Baby"} is ${age}` : `${baby.name ?? "Baby"} · ${age}`}
            </p>
          ) : null}
        </div>
        <BabyMascot mood={mood} size={112} label={`${baby.name ?? "Baby"} is ${moodWord(mood)}`} className="-my-2 -mr-1" />
      </div>
    </section>
  );
}

function moodWord(mood: MascotMood) {
  switch (mood) {
    case "sleeping":
      return "sleeping";
    case "feeding":
      return "feeding";
    case "hungry":
      return "probably getting hungry";
    default:
      return "awake";
  }
}
