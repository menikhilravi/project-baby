"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { cn } from "@/lib/utils";
import { KIND_META } from "@/lib/kind-meta";
import { ProgressRing } from "@/components/ui/progress-ring";
import { splitSpan } from "@/lib/time-format";
import type { LiveCounts, LiveSnapshot } from "@/lib/live-state";

type Ring = {
  kind: "feed" | "diaper" | "sleep";
  title: string;
  at: string | null;
  expectedMin: number;
  footer: string;
  ongoing?: boolean;
};

/**
 * Three "time since" rings. Each fills as time passes against what's typical
 * (the feed cadence, the age-based wake window, ~3h for diapers) and warms
 * only once it's past due — information, not an alarm. Each ring is the
 * shared element that morphs into its /log/[kind] page header.
 */
export function SinceRings({
  state,
  counts,
  now,
  feedIntervalMin,
  wakeWindowMin,
}: {
  state: LiveSnapshot;
  counts: LiveCounts;
  now: number;
  feedIntervalMin: number;
  wakeWindowMin: number;
}) {
  const sleeping = Boolean(state.openSleep);
  const rings: Ring[] = [
    {
      kind: "feed",
      title: "since feed",
      at: state.lastFeedAt,
      expectedMin: feedIntervalMin,
      footer: `${counts.feeds} today`,
    },
    {
      kind: "diaper",
      title: "since diaper",
      at: state.lastDiaperAt,
      expectedMin: 180,
      footer: `${counts.diapers} today`,
    },
    sleeping
      ? {
          kind: "sleep",
          title: "asleep",
          at: state.openSleep!.occurred_at,
          expectedMin: 120,
          footer: "sleeping now",
          ongoing: true,
        }
      : {
          kind: "sleep",
          title: "awake",
          at: state.lastWakeAt,
          expectedMin: wakeWindowMin,
          footer: "since last nap",
        },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {rings.map((r) => (
        <RingCell key={r.kind} ring={r} now={now} />
      ))}
    </div>
  );
}

function RingCell({ ring, now }: { ring: Ring; now: number }) {
  const meta = KIND_META[ring.kind];
  const Icon = meta.icon;
  const elapsedMs = ring.at ? Math.max(0, now - new Date(ring.at).getTime()) : 0;
  const ratio = ring.at ? elapsedMs / (ring.expectedMin * 60_000) : 0;
  const overdue = !ring.ongoing && ratio > 1.05;
  const span = ring.at ? splitSpan(elapsedMs) : null;
  const color = overdue ? "var(--due)" : meta.cssVar;

  return (
    <Link
      href={`/log/${ring.kind}`}
      transitionTypes={["nav-forward"]}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-tile bg-card px-1 pb-3 pt-4 shadow-soft ring-1 ring-border/60 transition-transform active:scale-[0.97]",
        ring.ongoing && "ring-2 ring-kind-sleep/40",
      )}
      aria-label={`${meta.label}: ${span ? `${span.value}${span.unit} ${ring.title}` : "nothing logged yet"}. ${ring.footer}.`}
    >
      <ViewTransition name={`kind-${ring.kind}`} share="morph" default="none">
        <ProgressRing value={ring.ongoing ? 1 : Math.min(ratio, 1)} size={92} stroke={8} color={color}>
          <Icon className={cn("mb-0.5 h-4 w-4", overdue ? "text-due-strong" : meta.tone.text)} />
          {span ? (
            <span className="font-display text-xl font-semibold leading-none nums">
              {span.value}
              <span className="ml-0.5 text-xs font-bold text-muted-foreground">{span.unit}</span>
            </span>
          ) : (
            <span className="font-display text-xl font-semibold leading-none text-muted-foreground/60">—</span>
          )}
        </ProgressRing>
      </ViewTransition>
      <span className="text-center leading-tight">
        <span className="block text-xs font-bold">{ring.at ? ring.title : `no ${meta.label.toLowerCase()} yet`}</span>
        <span className={cn("block text-[11px] font-semibold", overdue ? "text-due-strong" : "text-muted-foreground")}>
          {overdue ? "might be time" : ring.footer}
        </span>
      </span>
    </Link>
  );
}
