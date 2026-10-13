"use client";

import { LayoutGroup, m } from "motion/react";
import { Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { useNow } from "@/hooks/use-now";
import { formatClock } from "@/lib/time-format";
import { Pressable } from "@/components/ui/pressable";
import { BabyMascot } from "@/components/mascot/baby-mascot";
import { useQuickLog } from "./use-quick-log";

/**
 * Live nursing session: a big stopwatch, an L/R switcher whose glow slides to
 * the active side (tapping the other side switches), and Stop.
 */
export function NursingTimer({
  side,
  startedAt,
  serverNow,
  compact = false,
}: {
  side: "left" | "right";
  startedAt: string;
  serverNow?: number;
  compact?: boolean;
}) {
  const { startNursing, stopNursing } = useQuickLog();
  const tick = useNow(1000);
  const now = tick || serverNow || new Date(startedAt).getTime();
  const elapsed = now - new Date(startedAt).getTime();

  return (
    <section
      aria-label={`Nursing on the ${side} side`}
      className={cn(
        "relative overflow-hidden rounded-card bg-kind-feed-soft shadow-soft ring-1 ring-kind-feed/25",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex items-center gap-4">
        {!compact ? <BabyMascot mood="feeding" size={64} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-kind-feed-strong">
            Nursing · {side}
          </p>
          <p className="font-sans text-4xl font-black nums leading-tight tracking-tight" aria-live="off">
            {formatClock(elapsed)}
          </p>
        </div>
        <Pressable
          onClick={() => void stopNursing()}
          className="flex h-12 items-center gap-2 rounded-2xl bg-kind-feed px-4 text-sm font-bold text-on-accent shadow-squish"
        >
          <Square className="h-4 w-4 fill-current" />
          Stop
        </Pressable>
      </div>

      <LayoutGroup id="nursing-sides">
        <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Breast side">
          {(["left", "right"] as const).map((s) => {
            const active = s === side;
            return (
              <Pressable
                key={s}
                aria-pressed={active}
                onClick={(e) => {
                  if (!active) void startNursing(s, e.currentTarget);
                }}
                className={cn(
                  "relative flex h-14 items-center justify-center gap-2 rounded-2xl text-sm font-bold",
                  active ? "text-foreground" : "bg-card/60 text-muted-foreground",
                )}
              >
                {active ? (
                  <m.span
                    layoutId="nursing-glow"
                    transition={spring.snappy}
                    className="absolute inset-0 rounded-2xl bg-card shadow-pop ring-2 ring-kind-feed/50"
                  />
                ) : null}
                <span className="relative">{active ? (s === "left" ? "Left side" : "Right side") : `Switch to ${s}`}</span>
              </Pressable>
            );
          })}
        </div>
      </LayoutGroup>
    </section>
  );
}
