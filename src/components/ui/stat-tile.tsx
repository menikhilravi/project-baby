import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Big number + small label. `tone` is a soft background class (e.g. a kind's bgSoft). */
export function StatTile({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3.5 py-3",
        tone ?? "bg-card shadow-soft ring-1 ring-border/60",
        className,
      )}
    >
      <p className="truncate font-display text-2xl font-semibold leading-none nums">{value}</p>
      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
