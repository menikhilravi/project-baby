"use client";

import { useEffect, useState } from "react";
import { Droplets, Moon, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export type LastEventCell = {
  kind: "feed" | "diaper" | "sleep";
  occurred_at: string | null;
  who: string | null;
  ongoing?: boolean;
};

const META = {
  feed: { label: "Feed", icon: Utensils, accent: "text-amber-500" },
  diaper: { label: "Diaper", icon: Droplets, accent: "text-sky-500" },
  sleep: { label: "Sleep", icon: Moon, accent: "text-indigo-400" },
} as const;

export function LastEventsRow({ cells }: { cells: LastEventCell[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cells.map((cell) => (
        <Cell key={cell.kind} cell={cell} />
      ))}
    </div>
  );
}

function Cell({ cell }: { cell: LastEventCell }) {
  const meta = META[cell.kind];
  const Icon = meta.icon;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  let value: string;
  let subtle = false;
  if (cell.ongoing && cell.occurred_at) {
    value = formatDuration(now - new Date(cell.occurred_at).getTime());
  } else if (cell.occurred_at) {
    value = formatRelative(now - new Date(cell.occurred_at).getTime());
  } else {
    value = "—";
    subtle = true;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 px-3 py-3 flex flex-col gap-1.5",
        cell.ongoing && "bg-logger-soft/40 border-logger/30",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", meta.accent)} />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {meta.label}
        </span>
      </div>
      <p
        className={cn(
          "font-display text-lg leading-none font-semibold tabular-nums tracking-tight",
          subtle && "text-muted-foreground/50",
          cell.ongoing && "text-logger",
        )}
      >
        {value}
      </p>
      {cell.who ? (
        <p className="text-[10px] text-muted-foreground truncate">
          {cell.ongoing ? "sleeping now" : cell.who}
        </p>
      ) : null}
    </div>
  );
}

function formatRelative(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem === 0 ? `${h}h ago` : `${h}h ${rem}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDuration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return `${h}h ${rem}m`;
}
