import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BabyMascot, type MascotMood } from "./baby-mascot";

/** Friendly empty state: the baby peeking over a dashed card. */
export function EmptyState({
  title,
  body,
  action,
  mood = "peek",
  compact = false,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  mood?: MascotMood;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative pt-10", compact && "pt-8", className)}>
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <BabyMascot mood={mood} size={compact ? 56 : 72} />
      </div>
      <div
        className={cn(
          "rounded-card border-2 border-dashed border-border bg-card/60 text-center",
          compact ? "px-4 pb-4 pt-7" : "px-6 pb-6 pt-10",
        )}
      >
        <p className="font-display text-base font-semibold">{title}</p>
        {body ? <p className="mt-1 text-sm text-muted-foreground text-pretty">{body}</p> : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
