"use client";

import { useEffect, useState, useTransition } from "react";
import { Droplets, Moon, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { logEvent, toggleSleep } from "../actions";

export type OpenSleep = {
  id: number;
  occurred_at: string;
} | null;

const KIND_META = {
  feed: { label: "Feed", icon: Utensils, accent: "text-amber-500" },
  diaper: { label: "Diaper", icon: Droplets, accent: "text-sky-500" },
  sleep: { label: "Sleep", icon: Moon, accent: "text-indigo-400" },
} as const;

/**
 * Three tap buttons (Feed / Diaper / Sleep) with realtime tracking of the
 * couple's open sleep session. Used by /log and /today.
 */
export function QuickLogPanel({
  coupleId,
  initialOpenSleep,
  channelName,
}: {
  coupleId: string | null;
  initialOpenSleep: OpenSleep;
  /** Unique per mount so /log and /today don't collide on the same channel. */
  channelName: string;
}) {
  const [openSleep, setOpenSleep] = useState<OpenSleep>(initialOpenSleep);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "baby_events",
          ...(coupleId ? { filter: `couple_id=eq.${coupleId}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as {
              id: number;
              kind: string;
              occurred_at: string;
              ended_at: string | null;
            };
            if (row.kind === "sleep" && row.ended_at === null) {
              setOpenSleep({ id: row.id, occurred_at: row.occurred_at });
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as {
              id: number;
              kind: string;
              ended_at: string | null;
            };
            if (row.kind === "sleep" && row.ended_at !== null) {
              setOpenSleep((cur) => (cur && cur.id === row.id ? null : cur));
            }
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: number };
            setOpenSleep((cur) => (cur && cur.id === row.id ? null : cur));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, channelName]);

  const handleLog = (kind: "feed" | "diaper") => {
    startTransition(async () => {
      try {
        await logEvent(kind);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSleep = () => {
    // Optimistic toggle: if there's no open sleep, start one locally with
    // a temporary id so the button flips immediately. Realtime will reconcile
    // with the real row.
    if (openSleep) {
      setOpenSleep(null);
    } else {
      setOpenSleep({ id: -Date.now(), occurred_at: new Date().toISOString() });
    }
    startTransition(async () => {
      try {
        await toggleSleep();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <LogButton
          kind="feed"
          onClick={() => handleLog("feed")}
          disabled={pending}
        />
        <LogButton
          kind="diaper"
          onClick={() => handleLog("diaper")}
          disabled={pending}
        />
        <LogButton
          kind="sleep"
          onClick={handleSleep}
          disabled={pending}
          active={Boolean(openSleep)}
          sublabel={openSleep ? "Tap to wake" : undefined}
        />
      </div>
      {openSleep ? <SleepingBanner startedAt={openSleep.occurred_at} /> : null}
    </div>
  );
}

function LogButton({
  kind,
  onClick,
  disabled,
  active,
  sublabel,
}: {
  kind: "feed" | "diaper" | "sleep";
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  sublabel?: string;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group rounded-3xl border bg-card px-3 py-5 flex flex-col items-center gap-2 transition-all",
        "hover:bg-card/80 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        active && "bg-logger-soft border-logger ring-2 ring-logger/30",
      )}
    >
      <span
        className={cn(
          "grid place-items-center h-12 w-12 rounded-2xl ring-1 ring-border/40 transition-colors",
          active ? "bg-logger text-white" : cn("bg-muted/60", meta.accent),
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-sm font-semibold tracking-tight">{meta.label}</span>
      {sublabel ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {sublabel}
        </span>
      ) : null}
    </button>
  );
}

function SleepingBanner({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 60_000),
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <div className="rounded-2xl border border-logger/30 bg-logger-soft/60 px-4 py-3 flex items-center gap-3">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-logger text-white">
        <Moon className="h-4.5 w-4.5" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">Sleeping</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {h > 0 ? `${h}h ` : ""}
          {m}m so far
        </p>
      </div>
    </div>
  );
}
