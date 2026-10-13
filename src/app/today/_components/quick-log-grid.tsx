"use client";

import { cn } from "@/lib/utils";
import { KIND_META, type EventKind } from "@/lib/kind-meta";
import { Pressable } from "@/components/ui/pressable";
import { MilkBottle } from "@/components/milk/milk-bottle";
import { useQuickLogSheet, type QuickKind } from "@/components/quick-log/quick-log-sheet";
import { useQuickLog } from "@/components/quick-log/use-quick-log";
import { formatAgo, formatClock } from "@/lib/time-format";
import type { LiveCounts, LiveSnapshot } from "@/lib/live-state";

/**
 * Big squishy tiles for the three things you log all day, and a row of
 * smaller ones for the rest. Sleep toggles in one tap; the others open their
 * picker in the quick-log sheet.
 */
export function QuickLogGrid({
  state,
  counts,
  now,
  intakeHigh,
}: {
  state: LiveSnapshot;
  counts: LiveCounts;
  now: number;
  intakeHigh: number | null;
}) {
  const sheet = useQuickLogSheet();
  const { toggleSleep } = useQuickLog();
  const sleeping = Boolean(state.openSleep);
  const nursing = state.openNursing;

  const feedSub = nursing
    ? `Nursing · ${nursing.side === "left" ? "L" : "R"} ${formatClock(now - new Date(nursing.occurred_at).getTime())}`
    : state.lastFeedAt
      ? formatAgo(now - new Date(state.lastFeedAt).getTime())
      : "Tap to log";

  return (
    <section aria-label="Quick log" className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        <BigTile
          kind="feed"
          label={nursing ? "Nursing" : "Feed"}
          sub={feedSub}
          active={Boolean(nursing)}
          onPress={() => sheet.open("feed")}
          art={
            <MilkBottle
              level={intakeHigh ? Math.min(1, counts.bottleOz / intakeHigh) : Math.min(1, counts.bottleOz / 24)}
              ticks={4}
              className="h-14 w-8"
            />
          }
        />
        <BigTile
          kind="diaper"
          label="Diaper"
          sub={`${counts.diapers} today`}
          onPress={() => sheet.open("diaper")}
        />
        <BigTile
          kind="sleep"
          label={sleeping ? "Wake up" : "Sleep"}
          sub={sleeping ? "Tap when awake" : "Tap to start"}
          active={sleeping}
          onPress={(el) => void toggleSleep(el)}
        />
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {(["pump", "temp", "med", "tummy"] as const).map((k) => (
          <SmallTile key={k} kind={k} onPress={() => sheet.open(k)} />
        ))}
      </div>
    </section>
  );
}

function BigTile({
  kind,
  label,
  sub,
  active,
  onPress,
  art,
}: {
  kind: Extract<EventKind, "feed" | "diaper" | "sleep">;
  label: string;
  sub: string;
  active?: boolean;
  onPress: (el: HTMLElement) => void;
  art?: React.ReactNode;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Pressable
      onClick={(e) => onPress(e.currentTarget)}
      aria-pressed={kind === "sleep" ? Boolean(active) : undefined}
      className={cn(
        "relative flex min-h-[8.5rem] flex-col items-start justify-between overflow-hidden rounded-tile p-3.5 text-left shadow-squish",
        meta.tone.bgSoft,
        active && "ring-2 ring-inset",
        active && meta.tone.ring,
      )}
    >
      <span className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-card/80 shadow-soft", meta.tone.strong)}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.3} />
      </span>
      {art && !active ? <span className="absolute right-2.5 top-2.5 opacity-90">{art}</span> : null}
      {active ? (
        <span className={cn("absolute right-3 top-3 h-2.5 w-2.5 rounded-full", meta.tone.bg)}>
          <span className={cn("absolute inset-0 rounded-full animate-halo", meta.tone.bg)} />
        </span>
      ) : null}
      <span className="mt-3 block w-full">
        <span className="block font-display text-lg font-semibold leading-tight">{label}</span>
        <span className="block truncate text-xs font-semibold text-muted-foreground nums">{sub}</span>
      </span>
    </Pressable>
  );
}

function SmallTile({ kind, onPress }: { kind: QuickKind; onPress: () => void }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Pressable
      onClick={onPress}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-card py-3 shadow-soft ring-1 ring-border/60"
    >
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl", meta.tone.bgSoft, meta.tone.strong)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-xs font-bold">{kind === "tummy" ? "Tummy" : kind === "med" ? "Meds" : meta.label}</span>
    </Pressable>
  );
}
