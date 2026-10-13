/**
 * Pure model for the live baby state shared across the app (Today hero,
 * time-since rings, nursing/sleep timers, the quick-log sheet, header
 * mascot). The provider keeps a confirmed base snapshot and layers optimistic
 * ops on top; realtime and server refreshes rebase it.
 */
import type { EventKind } from "@/lib/kind-meta";

export type LiveEvent = {
  id: number;
  kind: EventKind;
  subtype: string | null;
  amount: number | null;
  unit: string | null;
  occurred_at: string;
  ended_at: string | null;
};

export type OpenSleep = { id: number; occurred_at: string } | null;
export type OpenNursing = { id: number; side: "left" | "right"; occurred_at: string } | null;

export type LiveCounts = { feeds: number; diapers: number; bottleOz: number };

export type LiveSnapshot = {
  /** Feed + diaper events from the last ~30h (for today's counts). */
  recent: LiveEvent[];
  openSleep: OpenSleep;
  openNursing: OpenNursing;
  lastBreastSide: "left" | "right" | null;
  lastFeedAt: string | null;
  lastDiaperAt: string | null;
  /** When the most recent finished sleep ended. */
  lastWakeAt: string | null;
  /** Server clock + counts so SSR and hydration render identical text. */
  serverNow: number;
  serverCounts: LiveCounts;
};

export const EMPTY_SNAPSHOT: LiveSnapshot = {
  recent: [],
  openSleep: null,
  openNursing: null,
  lastBreastSide: null,
  lastFeedAt: null,
  lastDiaperAt: null,
  lastWakeAt: null,
  serverNow: 0,
  serverCounts: { feeds: 0, diapers: 0, bottleOz: 0 },
};

export type LiveOp =
  | { type: "insert"; event: LiveEvent }
  | { type: "remove"; id: number }
  | { type: "startSleep"; id: number; at: string }
  | { type: "stopSleep"; at: string }
  | { type: "reopenSleep"; id: number; occurred_at: string }
  | { type: "startNursing"; id: number; side: "left" | "right"; at: string }
  | { type: "stopNursing"; at: string }
  | { type: "reopenNursing"; id: number; side: "left" | "right"; occurred_at: string };

const OZ_PER_ML = 1 / 29.5735;

const later = (a: string | null, b: string | null) =>
  !a ? b : !b ? a : new Date(a) >= new Date(b) ? a : b;

export function applyOp(s: LiveSnapshot, op: LiveOp): LiveSnapshot {
  switch (op.type) {
    case "insert": {
      const e = op.event;
      if (s.recent.some((r) => r.id === e.id)) return s;
      const next: LiveSnapshot = { ...s };
      if (e.kind === "feed" || e.kind === "diaper") {
        next.recent = [e, ...s.recent];
      }
      if (e.kind === "feed") {
        next.lastFeedAt = later(s.lastFeedAt, e.occurred_at);
        if (e.ended_at === null && (e.subtype === "left" || e.subtype === "right")) {
          next.openNursing = { id: e.id, side: e.subtype, occurred_at: e.occurred_at };
        }
      }
      if (e.kind === "diaper") next.lastDiaperAt = later(s.lastDiaperAt, e.occurred_at);
      if (e.kind === "sleep" && e.ended_at === null) {
        next.openSleep = { id: e.id, occurred_at: e.occurred_at };
      }
      return next;
    }
    case "remove": {
      const removed = s.recent.find((r) => r.id === op.id);
      const recent = s.recent.filter((r) => r.id !== op.id);
      const next: LiveSnapshot = {
        ...s,
        recent,
        openSleep: s.openSleep?.id === op.id ? null : s.openSleep,
        openNursing: s.openNursing?.id === op.id ? null : s.openNursing,
      };
      if (removed?.kind === "feed" && s.lastFeedAt === removed.occurred_at) {
        next.lastFeedAt = latestOf(recent, "feed");
      }
      if (removed?.kind === "diaper" && s.lastDiaperAt === removed.occurred_at) {
        next.lastDiaperAt = latestOf(recent, "diaper");
      }
      return next;
    }
    case "startSleep":
      return { ...s, openSleep: { id: op.id, occurred_at: op.at } };
    case "stopSleep":
      return { ...s, openSleep: null, lastWakeAt: s.openSleep ? op.at : s.lastWakeAt };
    case "reopenSleep":
      return { ...s, openSleep: { id: op.id, occurred_at: op.occurred_at } };
    case "startNursing": {
      const prev = s.openNursing;
      const e: LiveEvent = {
        id: op.id,
        kind: "feed",
        subtype: op.side,
        amount: null,
        unit: null,
        occurred_at: op.at,
        ended_at: null,
      };
      return {
        ...s,
        // A side switch closes the previous session (it stays in `recent`).
        recent: [
          e,
          ...s.recent.map((r) => (prev && r.id === prev.id ? { ...r, ended_at: op.at } : r)),
        ],
        openNursing: { id: op.id, side: op.side, occurred_at: op.at },
        lastBreastSide: prev?.side ?? s.lastBreastSide,
        lastFeedAt: later(s.lastFeedAt, op.at),
      };
    }
    case "stopNursing": {
      const prev = s.openNursing;
      if (!prev) return s;
      return {
        ...s,
        openNursing: null,
        lastBreastSide: prev.side,
        recent: s.recent.map((r) => (r.id === prev.id ? { ...r, ended_at: op.at } : r)),
      };
    }
    case "reopenNursing":
      return {
        ...s,
        openNursing: { id: op.id, side: op.side, occurred_at: op.occurred_at },
        recent: s.recent.map((r) => (r.id === op.id ? { ...r, ended_at: null } : r)),
      };
  }
}

function latestOf(events: LiveEvent[], kind: EventKind): string | null {
  let best: string | null = null;
  for (const e of events) if (e.kind === kind) best = later(best, e.occurred_at);
  return best;
}

function isSameLocalDay(iso: string, now: number) {
  const d = new Date(iso);
  const n = new Date(now);
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function bottleOz(e: Pick<LiveEvent, "subtype" | "amount" | "unit">): number {
  if (e.subtype !== "bottle" || e.amount == null) return 0;
  return e.unit === "ml" ? e.amount * OZ_PER_ML : e.amount;
}

/** Today's counts in the viewer's local timezone. */
export function countsFor(events: LiveEvent[], now: number): LiveCounts {
  let feeds = 0;
  let diapers = 0;
  let oz = 0;
  for (const e of events) {
    if (!isSameLocalDay(e.occurred_at, now)) continue;
    if (e.kind === "feed") {
      feeds += 1;
      oz += bottleOz(e);
    } else if (e.kind === "diaper") {
      diapers += 1;
    }
  }
  return { feeds, diapers, bottleOz: Math.round(oz * 10) / 10 };
}

/** Row shape from baby_events (realtime payload / select) → LiveEvent. */
export function toLiveEvent(row: {
  id: number;
  kind: string;
  subtype: string | null;
  amount: number | null;
  unit: string | null;
  occurred_at: string;
  ended_at: string | null;
}): LiveEvent {
  return {
    id: row.id,
    kind: row.kind as EventKind,
    subtype: row.subtype,
    amount: row.amount,
    unit: row.unit,
    occurred_at: row.occurred_at,
    ended_at: row.ended_at,
  };
}
