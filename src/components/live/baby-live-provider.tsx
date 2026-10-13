"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchLiveSnapshot } from "@/lib/live-snapshot";
import {
  applyOp,
  countsFor,
  EMPTY_SNAPSHOT,
  toLiveEvent,
  type LiveCounts,
  type LiveOp,
  type LiveSnapshot,
} from "@/lib/live-state";
import { useNow } from "@/hooks/use-now";

type RunOptions<T> = {
  /** Applied instantly; dropped when the action settles. */
  optimistic?: LiveOp;
  /** Ops that make the confirmed state match the server's answer. */
  confirm?: (result: T) => LiveOp[];
};

type LiveContextValue = {
  /** null until seeded by a page or fetched in the background. */
  state: LiveSnapshot | null;
  seed: (snapshot: LiveSnapshot) => void;
  run: <T>(action: () => Promise<T>, opts?: RunOptions<T>) => Promise<T>;
  /** Apply a confirmed change directly (e.g. after an undo). */
  apply: (...ops: LiveOp[]) => void;
};

const LiveContext = createContext<LiveContextValue | null>(null);

/**
 * App-wide live baby state with a single realtime channel. Pages that already
 * fetched a snapshot on the server seed it (no flash); elsewhere it loads in
 * the background so the quick-log sheet and header mascot stay accurate.
 */
export function BabyLiveProvider({
  coupleId,
  userId,
  children,
}: {
  coupleId: string | null;
  userId: string;
  children: ReactNode;
}) {
  const [base, setBase] = useState<LiveSnapshot | null>(null);
  const [state, addOptimistic] = useOptimistic<LiveSnapshot | null, LiveOp>(base, (s, op) =>
    applyOp(s ?? EMPTY_SNAPSHOT, op),
  );
  const seeded = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const refetch = useCallback(async () => {
    const snap = await fetchLiveSnapshot(createClient());
    setBase(snap);
  }, []);

  // Child effects run first, so a page that seeds wins over this fetch.
  useEffect(() => {
    if (seeded.current) return;
    let alive = true;
    fetchLiveSnapshot(createClient())
      .then((snap) => {
        if (alive && !seeded.current) setBase(snap);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => void refetch().catch(() => {}), 400);
    };
    const schedulePageRefresh = () => {
      // A partner logged something: let server-rendered cards catch up.
      const p = pathRef.current;
      if (!p.startsWith("/today") && !p.startsWith("/log")) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 1000);
    };

    const channel = supabase
      .channel(`live:${coupleId ?? userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "baby_events",
          filter: coupleId ? `couple_id=eq.${coupleId}` : `user_id=eq.${userId}`,
        },
        (payload) => {
          const fromPartner =
            (payload.new as { user_id?: string } | null)?.user_id !== undefined &&
            (payload.new as { user_id?: string }).user_id !== userId;
          if (payload.eventType === "INSERT") {
            const row = toLiveEvent(payload.new as Parameters<typeof toLiveEvent>[0]);
            setBase((prev) => applyOp(prev ?? EMPTY_SNAPSHOT, { type: "insert", event: row }));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Parameters<typeof toLiveEvent>[0];
            setBase((prev) => {
              const s = prev ?? EMPTY_SNAPSHOT;
              if (row.kind === "sleep") {
                if (row.ended_at && s.openSleep?.id === row.id)
                  return applyOp(s, { type: "stopSleep", at: row.ended_at });
                if (!row.ended_at)
                  return applyOp(s, { type: "reopenSleep", id: row.id, occurred_at: row.occurred_at });
              }
              if (row.kind === "feed" && (row.subtype === "left" || row.subtype === "right")) {
                if (row.ended_at && s.openNursing?.id === row.id)
                  return applyOp(s, { type: "stopNursing", at: row.ended_at });
                if (!row.ended_at)
                  return applyOp(s, {
                    type: "reopenNursing",
                    id: row.id,
                    side: row.subtype,
                    occurred_at: row.occurred_at,
                  });
              }
              return s;
            });
            // Edits can move times/amounts — resync the derived fields.
            scheduleRefetch();
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: number }).id;
            if (id != null) setBase((prev) => applyOp(prev ?? EMPTY_SNAPSHOT, { type: "remove", id }));
            scheduleRefetch();
          }
          if (fromPartner) schedulePageRefresh();
        },
      )
      .subscribe();

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId, refetch, router]);

  const seed = useCallback((snapshot: LiveSnapshot) => {
    seeded.current = true;
    setBase(snapshot);
  }, []);

  const apply = useCallback((...ops: LiveOp[]) => {
    setBase((prev) => ops.reduce(applyOp, prev ?? EMPTY_SNAPSHOT));
  }, []);

  const run = useCallback(
    <T,>(action: () => Promise<T>, opts: RunOptions<T> = {}) =>
      new Promise<T>((resolve, reject) => {
        startTransition(async () => {
          if (opts.optimistic) addOptimistic(opts.optimistic);
          try {
            const result = await action();
            const ops = opts.confirm?.(result) ?? [];
            // Must be a transition too, or the optimistic layer drops before
            // the confirmed base lands (a visible flicker back).
            startTransition(() => {
              if (ops.length) setBase((prev) => ops.reduce(applyOp, prev ?? EMPTY_SNAPSHOT));
            });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      }),
    [addOptimistic],
  );

  return (
    <LiveContext.Provider value={{ state, seed, run, apply }}>{children}</LiveContext.Provider>
  );
}

export function useBabyLiveContext(): LiveContextValue | null {
  return useContext(LiveContext);
}

/**
 * Read the live state, falling back to a server snapshot (SSR + hydration).
 * Passing `seed` pushes that snapshot into the provider whenever it changes.
 */
export function useBabyLive(seed?: LiveSnapshot | null): {
  state: LiveSnapshot;
  ready: boolean;
  /** 0 during SSR/hydration → use state.serverNow. */
  now: number;
  counts: LiveCounts;
  run: LiveContextValue["run"];
  apply: LiveContextValue["apply"];
} {
  const ctx = useContext(LiveContext);
  const ctxSeed = ctx?.seed;
  useEffect(() => {
    if (seed && ctxSeed) ctxSeed(seed);
  }, [seed, ctxSeed]);

  const tick = useNow(60_000);
  const state = ctx?.state ?? seed ?? EMPTY_SNAPSHOT;
  const now = tick || state.serverNow || 0;
  const counts = tick ? countsFor(state.recent, tick) : state.serverCounts;

  return {
    state,
    ready: Boolean(ctx?.state ?? seed),
    now,
    counts,
    run: ctx?.run ?? ((action) => action()),
    apply: ctx?.apply ?? (() => {}),
  };
}
