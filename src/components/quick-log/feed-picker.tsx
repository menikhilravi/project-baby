"use client";

import { useState } from "react";
import { Carrot } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Pressable } from "@/components/ui/pressable";
import { BottlePicker } from "@/components/milk/bottle-picker";
import { useQuickLog } from "./use-quick-log";
import { NursingTimer } from "./nursing-timer";

type Mode = "breast" | "bottle" | "solid";

export function FeedPicker({ onDone }: { onDone?: () => void }) {
  const { state, startNursing, logFeed } = useQuickLog();
  const [mode, setMode] = useState<Mode>("breast");
  const next = state.lastBreastSide ? (state.lastBreastSide === "left" ? "right" : "left") : null;

  return (
    <div className="space-y-5">
      <SegmentedControl
        label="Feed type"
        value={mode}
        onChange={setMode}
        options={[
          { value: "breast", label: "Breast" },
          { value: "bottle", label: "Bottle" },
          { value: "solid", label: "Solids" },
        ]}
      />

      {mode === "breast" ? (
        state.openNursing ? (
          <NursingTimer compact side={state.openNursing.side} startedAt={state.openNursing.occurred_at} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(["left", "right"] as const).map((side) => (
                <Pressable
                  key={side}
                  onClick={(e) => {
                    void startNursing(side, e.currentTarget);
                    onDone?.();
                  }}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-full bg-kind-feed-soft shadow-squish",
                    next === side && "ring-4 ring-kind-feed/45",
                  )}
                >
                  {next === side ? (
                    <span className="absolute top-4 rounded-full bg-kind-feed px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-accent">
                      Next
                    </span>
                  ) : null}
                  <span className="font-display text-5xl font-semibold text-kind-feed-strong">
                    {side === "left" ? "L" : "R"}
                  </span>
                  <span className="text-sm font-semibold capitalize text-muted-foreground">{side}</span>
                </Pressable>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {next
                ? `Last time was the ${state.lastBreastSide} — offer the ${next} first.`
                : "Tap a side to start the timer."}
            </p>
          </div>
        )
      ) : null}

      {mode === "bottle" ? (
        <BottlePicker
          onLog={(amount, unit) => {
            void logFeed({ subtype: "bottle", amount, unit });
            setTimeout(() => onDone?.(), 1100);
          }}
        />
      ) : null}

      {mode === "solid" ? (
        <div className="space-y-3">
          <Pressable
            onClick={(e) => {
              void logFeed({ subtype: "solid" }, e.currentTarget);
              onDone?.();
            }}
            className="flex w-full flex-col items-center gap-2 rounded-tile bg-kind-tummy-soft py-8 shadow-squish"
          >
            <Carrot className="h-10 w-10 text-kind-tummy-strong" />
            <span className="font-display text-lg font-semibold">Log solids</span>
          </Pressable>
          <button
            type="button"
            onClick={(e) => {
              void logFeed({}, e.currentTarget);
              onDone?.();
            }}
            className="mx-auto block h-11 rounded-full px-5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Just log a feed
          </button>
        </div>
      ) : null}
    </div>
  );
}
