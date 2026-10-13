"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { spring } from "@/lib/motion";
import { useBabyLive } from "@/components/live/baby-live-provider";
import { NursingTimer } from "@/components/quick-log/nursing-timer";
import { SleepTimer } from "@/components/quick-log/sleep-timer";
import { IntakeGauge } from "@/components/milk/intake-gauge";
import { MascotPeek } from "@/components/mascot/mascot-peek";
import type { MascotMood } from "@/components/mascot/baby-mascot";
import type { LiveSnapshot } from "@/lib/live-state";
import { TodayHero } from "./today-hero";
import { SinceRings } from "./since-rings";
import { QuickLogGrid } from "./quick-log-grid";

const PEEK_KEY = "today-peeked";

/**
 * Everything on Today that reacts live: hero mascot, running sessions, the
 * time-since rings, the quick-log tiles and the bottle gauge. Seeds the
 * app-wide live store with the server snapshot so there's no flash.
 */
export function TodayLive({
  snapshot,
  feedIntervalMin,
  wakeWindowMin,
  intakeRange,
}: {
  snapshot: LiveSnapshot;
  feedIntervalMin: number;
  wakeWindowMin: number;
  intakeRange: { low: number; high: number } | null;
}) {
  const { state, counts, now } = useBabyLive(snapshot);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    // Peek once per session — a little hello, not a nag.
    try {
      if (!sessionStorage.getItem(PEEK_KEY)) {
        sessionStorage.setItem(PEEK_KEY, "1");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading sessionStorage after mount
        setPeek(true);
      }
    } catch {}
  }, []);

  const feedOverdueMin = state.lastFeedAt
    ? (now - new Date(state.lastFeedAt).getTime()) / 60_000 - feedIntervalMin
    : -Infinity;
  const mood: MascotMood = state.openSleep
    ? "sleeping"
    : state.openNursing
      ? "feeding"
      : feedOverdueMin > 30
        ? "hungry"
        : "idle";

  return (
    <div className="space-y-4">
      <TodayHero now={now} mood={mood} />

      <AnimatePresence initial={false} mode="popLayout">
        {state.openNursing ? (
          <m.div
            key="nursing"
            layout
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={spring.gentle}
          >
            <NursingTimer
              side={state.openNursing.side}
              startedAt={state.openNursing.occurred_at}
              serverNow={state.serverNow}
            />
          </m.div>
        ) : null}
        {state.openSleep ? (
          <m.div
            key="sleep"
            layout
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={spring.gentle}
          >
            <SleepTimer startedAt={state.openSleep.occurred_at} serverNow={state.serverNow} />
          </m.div>
        ) : null}
      </AnimatePresence>

      <m.div layout transition={spring.gentle}>
        <SinceRings
          state={state}
          counts={counts}
          now={now}
          feedIntervalMin={feedIntervalMin}
          wakeWindowMin={wakeWindowMin}
        />
      </m.div>

      <m.div layout transition={spring.gentle} className="relative overflow-hidden rounded-[1.9rem] p-0.5">
        <QuickLogGrid state={state} counts={counts} now={now} intakeHigh={intakeRange?.high ?? null} />
        {peek ? <MascotPeek edge="right" size={64} delay={0.8} /> : null}
      </m.div>

      <AnimatePresence initial={false}>
        {counts.bottleOz > 0 ? (
          <m.div
            key="intake"
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={spring.gentle}
          >
            <IntakeGauge oz={counts.bottleOz} range={intakeRange} />
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
