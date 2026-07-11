"use client";

import { useEffect, useState, useTransition } from "react";
import { Droplets, Minus, Moon, Plus, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  DIAPER_SUBTYPES,
  FEED_SUBTYPES,
  subtypeLabel,
  type EventDetail,
} from "@/lib/baby-events";
import {
  logEvent,
  startNursing,
  stopNursing,
  toggleSleep,
} from "../actions";

export type OpenSleep = {
  id: number;
  occurred_at: string;
} | null;

export type OpenNursing = {
  id: number;
  side: "left" | "right";
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
 *
 * Tapping Feed or Diaper expands an inline detail picker (pee/poop, side,
 * bottle oz…). Every picker keeps a "Just log" path so a fast tap still
 * records a typeless event.
 */
export function QuickLogPanel({
  coupleId,
  initialOpenSleep,
  initialOpenNursing = null,
  lastBreastSide = null,
  channelName,
}: {
  coupleId: string | null;
  initialOpenSleep: OpenSleep;
  initialOpenNursing?: OpenNursing;
  /** Side of the most recent nursing session — drives the "offer X next" hint. */
  lastBreastSide?: "left" | "right" | null;
  /** Unique per mount so /log and /today don't collide on the same channel. */
  channelName: string;
}) {
  const [openSleep, setOpenSleep] = useState<OpenSleep>(initialOpenSleep);
  const [openNursing, setOpenNursing] =
    useState<OpenNursing>(initialOpenNursing);
  const [lastSide, setLastSide] = useState<"left" | "right" | null>(
    lastBreastSide,
  );
  const [expanded, setExpanded] = useState<"feed" | "diaper" | null>(null);
  const [pending, startTransition] = useTransition();

  const nextSide: "left" | "right" | null = lastSide
    ? lastSide === "left"
      ? "right"
      : "left"
    : null;

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
              subtype: string | null;
              occurred_at: string;
              ended_at: string | null;
            };
            if (row.kind === "sleep" && row.ended_at === null) {
              setOpenSleep({ id: row.id, occurred_at: row.occurred_at });
            }
            if (
              row.kind === "feed" &&
              row.ended_at === null &&
              (row.subtype === "left" || row.subtype === "right")
            ) {
              setOpenNursing({
                id: row.id,
                side: row.subtype,
                occurred_at: row.occurred_at,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as {
              id: number;
              kind: string;
              subtype: string | null;
              ended_at: string | null;
            };
            if (row.kind === "sleep" && row.ended_at !== null) {
              setOpenSleep((cur) => (cur && cur.id === row.id ? null : cur));
            }
            if (row.kind === "feed" && row.ended_at !== null) {
              setOpenNursing((cur) => (cur && cur.id === row.id ? null : cur));
              if (row.subtype === "left" || row.subtype === "right") {
                setLastSide(row.subtype);
              }
            }
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: number };
            setOpenSleep((cur) => (cur && cur.id === row.id ? null : cur));
            setOpenNursing((cur) => (cur && cur.id === row.id ? null : cur));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, channelName]);

  const log = (kind: "feed" | "diaper", detail?: EventDetail) => {
    setExpanded(null);
    startTransition(async () => {
      try {
        await logEvent(kind, detail);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const toggleExpanded = (kind: "feed" | "diaper") => {
    setExpanded((cur) => (cur === kind ? null : kind));
  };

  const nurse = (side: "left" | "right") => {
    setExpanded(null);
    // Optimistic: flip to the new open session immediately; realtime reconciles.
    setOpenNursing({
      id: -Date.now(),
      side,
      occurred_at: new Date().toISOString(),
    });
    startTransition(async () => {
      try {
        await startNursing(side);
      } catch (err) {
        console.error(err);
        setOpenNursing(null);
      }
    });
  };

  const stopNurse = () => {
    const wasSide = openNursing?.side ?? null;
    setOpenNursing(null);
    if (wasSide) setLastSide(wasSide);
    startTransition(async () => {
      try {
        await stopNursing();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSleep = () => {
    setExpanded(null);
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
          onClick={() => toggleExpanded("feed")}
          disabled={pending}
          active={expanded === "feed" || Boolean(openNursing)}
          sublabel={openNursing ? `Nursing · ${openNursing.side}` : undefined}
        />
        <LogButton
          kind="diaper"
          onClick={() => toggleExpanded("diaper")}
          disabled={pending}
          active={expanded === "diaper"}
        />
        <LogButton
          kind="sleep"
          onClick={handleSleep}
          disabled={pending}
          active={Boolean(openSleep)}
          sublabel={openSleep ? "Tap to wake" : undefined}
        />
      </div>

      {expanded === "diaper" ? (
        <DiaperPicker
          disabled={pending}
          onPick={(subtype) => log("diaper", { subtype })}
          onSkip={() => log("diaper")}
        />
      ) : null}

      {expanded === "feed" ? (
        <FeedPicker
          disabled={pending}
          nextSide={nextSide}
          onNurse={nurse}
          onPick={(detail) => log("feed", detail)}
          onSkip={() => log("feed")}
        />
      ) : null}

      {openNursing ? (
        <NursingBanner
          startedAt={openNursing.occurred_at}
          side={openNursing.side}
          onStop={stopNurse}
          onSwitch={() => nurse(openNursing.side === "left" ? "right" : "left")}
          disabled={pending}
        />
      ) : null}

      {openSleep ? <SleepingBanner startedAt={openSleep.occurred_at} /> : null}
    </div>
  );
}

function PickerShell({
  children,
  onSkip,
  disabled,
}: {
  children: React.ReactNode;
  onSkip: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 space-y-2">
      <div className="flex flex-wrap gap-2">{children}</div>
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        Just log it
      </button>
    </div>
  );
}

function Chip({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-all",
        "hover:bg-card active:scale-[0.97] disabled:opacity-50",
        active
          ? "bg-logger-soft border-logger text-logger ring-1 ring-logger/30"
          : "bg-card border-border text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function DiaperPicker({
  onPick,
  onSkip,
  disabled,
}: {
  onPick: (subtype: (typeof DIAPER_SUBTYPES)[number]) => void;
  onSkip: () => void;
  disabled?: boolean;
}) {
  return (
    <PickerShell onSkip={onSkip} disabled={disabled}>
      {DIAPER_SUBTYPES.map((s) => (
        <Chip
          key={s}
          label={subtypeLabel(s) ?? s}
          onClick={() => onPick(s)}
          disabled={disabled}
        />
      ))}
    </PickerShell>
  );
}

function FeedPicker({
  onPick,
  onNurse,
  onSkip,
  nextSide,
  disabled,
}: {
  onPick: (detail: EventDetail) => void;
  onNurse: (side: "left" | "right") => void;
  onSkip: () => void;
  nextSide: "left" | "right" | null;
  disabled?: boolean;
}) {
  const [oz, setOz] = useState(4);
  const [bottle, setBottle] = useState(false);

  if (bottle) {
    return (
      <PickerShell onSkip={onSkip} disabled={disabled}>
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOz((v) => Math.max(0.5, +(v - 0.5).toFixed(1)))}
              disabled={disabled}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-card disabled:opacity-50"
              aria-label="Less"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-sm font-semibold tabular-nums">
              {oz} oz
            </span>
            <button
              type="button"
              onClick={() => setOz((v) => +(v + 0.5).toFixed(1))}
              disabled={disabled}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-card disabled:opacity-50"
              aria-label="More"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onPick({ subtype: "bottle", amount: oz, unit: "oz" })}
            disabled={disabled}
            className="ml-auto rounded-full bg-logger px-4 py-1.5 text-sm font-semibold text-white hover:bg-logger/90 active:scale-[0.97] disabled:opacity-50"
          >
            Log bottle
          </button>
        </div>
      </PickerShell>
    );
  }

  return (
    <PickerShell onSkip={onSkip} disabled={disabled}>
      {FEED_SUBTYPES.map((s) => {
        if (s === "bottle") {
          return (
            <Chip
              key={s}
              label="bottle"
              onClick={() => setBottle(true)}
              disabled={disabled}
            />
          );
        }
        if (s === "left" || s === "right") {
          // Tapping a side starts a timed nursing session (not an instant log).
          return (
            <Chip
              key={s}
              label={s}
              onClick={() => onNurse(s)}
              disabled={disabled}
              active={nextSide === s}
            />
          );
        }
        return (
          <Chip
            key={s}
            label={subtypeLabel(s) ?? s}
            onClick={() => onPick({ subtype: s })}
            disabled={disabled}
          />
        );
      })}
      {nextSide ? (
        <p className="w-full text-[11px] text-muted-foreground">
          Last on the {nextSide === "left" ? "right" : "left"} — offer the{" "}
          <span className="font-medium capitalize text-foreground">
            {nextSide}
          </span>{" "}
          next.
        </p>
      ) : null}
    </PickerShell>
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
        "group rounded-2xl border border-border bg-card px-3 py-5 flex flex-col items-center gap-2.5 transition-all duration-200",
        "hover:border-foreground/20 active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        active && "bg-logger-soft border-logger ring-1 ring-logger/40",
      )}
    >
      <span
        className={cn(
          "grid place-items-center h-11 w-11 rounded-2xl transition-colors",
          active ? "bg-logger text-white" : cn("bg-muted", meta.accent),
        )}
      >
        <Icon className="h-5.5 w-5.5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        {meta.label}
      </span>
      {sublabel ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {sublabel}
        </span>
      ) : null}
    </button>
  );
}

function NursingBanner({
  startedAt,
  side,
  onStop,
  onSwitch,
  disabled,
}: {
  startedAt: string;
  side: "left" | "right";
  onStop: () => void;
  onSwitch: () => void;
  disabled?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return (
    <div className="rounded-2xl border border-logger/30 bg-logger-soft/60 px-4 py-3 flex items-center gap-3">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-logger text-white">
        <Utensils className="h-4.5 w-4.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize">Nursing · {side}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {mm}:{String(ss).padStart(2, "0")}
        </p>
      </div>
      <button
        type="button"
        onClick={onSwitch}
        disabled={disabled}
        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium capitalize hover:bg-muted disabled:opacity-50"
      >
        Switch to {side === "left" ? "right" : "left"}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={disabled}
        className="rounded-full bg-logger px-4 py-1.5 text-xs font-semibold text-white hover:bg-logger/90 active:scale-[0.97] disabled:opacity-50"
      >
        Stop
      </button>
    </div>
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
