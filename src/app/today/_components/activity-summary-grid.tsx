"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KIND_META } from "@/lib/kind-meta";

export type SummaryCell = {
  kind: "feed" | "diaper" | "sleep";
  occurred_at: string | null;
  ongoing?: boolean;
  /** Today's count (feed / diaper). Sleep leaves this null. */
  count?: number | null;
};

export function ActivitySummaryGrid({ cells }: { cells: SummaryCell[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cells.map((cell) => (
        <Cell key={cell.kind} cell={cell} />
      ))}
    </div>
  );
}

function Cell({ cell }: { cell: SummaryCell }) {
  const meta = KIND_META[cell.kind];
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

  const footer = cell.ongoing
    ? "sleeping now"
    : cell.count != null
      ? `${cell.count} today`
      : cell.occurred_at
        ? "last"
        : "none yet";

  return (
    <Link
      href={`/log/${cell.kind}`}
      className={cn(
        "group rounded-2xl border bg-card px-3 py-3 flex flex-col gap-1.5 transition-colors hover:border-foreground/20",
        cell.ongoing && "bg-logger-soft/40 border-logger/30",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", meta.accent)} />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {meta.label}
        </span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
      </div>
      <p
        className={cn(
          "font-display nums text-2xl leading-none font-bold tracking-tight",
          subtle && "text-muted-foreground/50",
          cell.ongoing && "text-logger",
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">{footer}</p>
    </Link>
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
