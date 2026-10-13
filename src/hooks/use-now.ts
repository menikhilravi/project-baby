"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared clock per resolution instead of a setInterval per component.
 * Ticks pause while the tab is hidden and catch up instantly on return.
 * The server snapshot is 0, so SSR output never embeds a wall-clock time;
 * callers fall back to a server-provided `now` until hydrated.
 */
type Channel = {
  now: number;
  listeners: Set<() => void>;
  timer: number | null;
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => number;
};

const channels = new Map<number, Channel>();

function notify(ch: Channel) {
  ch.now = Date.now();
  ch.listeners.forEach((l) => l());
}

function start(ms: number, ch: Channel) {
  if (ch.timer != null || document.hidden) return;
  // Refresh silently: React re-reads the snapshot right after subscribing.
  ch.now = Date.now();
  ch.timer = window.setInterval(() => notify(ch), ms);
}

function stop(ch: Channel) {
  if (ch.timer != null) window.clearInterval(ch.timer);
  ch.timer = null;
}

let visibilityBound = false;
function bindVisibility() {
  if (visibilityBound) return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    channels.forEach((ch, ms) => {
      if (document.hidden) {
        stop(ch);
      } else if (ch.listeners.size) {
        start(ms, ch);
        notify(ch);
      }
    });
  });
}

function channel(ms: number): Channel {
  const ch = channels.get(ms);
  if (ch) return ch;
  const created: Channel = {
    now: 0,
    listeners: new Set(),
    timer: null,
    // Stable identities — a new subscribe fn per render would resubscribe forever.
    subscribe: (cb) => {
      bindVisibility();
      created.listeners.add(cb);
      start(ms, created);
      return () => {
        created.listeners.delete(cb);
        if (!created.listeners.size) stop(created);
      };
    },
    getSnapshot: () => created.now,
  };
  channels.set(ms, created);
  return created;
}

const serverSnapshot = () => 0;

export function useNow(resolutionMs: 1000 | 60_000 = 60_000): number {
  const ch = channel(resolutionMs);
  return useSyncExternalStore(ch.subscribe, ch.getSnapshot, serverSnapshot);
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
