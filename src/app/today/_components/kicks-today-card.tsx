import Link from "next/link";
import { ChevronRight, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

export function KicksTodayCard({
  count,
  canLog,
}: {
  count: number;
  canLog: boolean;
}) {
  const reachedTen = count >= 10;
  return (
    <Link
      href="/kicks"
      className={cn(
        "block rounded-2xl border bg-card/60 p-4 transition-all",
        "hover:bg-card hover:border-border/80 hover:shadow-sm",
        reachedTen
          ? "border-kicks/50 bg-kicks-soft/50"
          : "border-border/60",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid place-items-center h-10 w-10 rounded-2xl ring-1 ring-border/40",
            "bg-kicks-soft text-kicks",
          )}
        >
          <Footprints className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Kicks · last 2h
          </p>
          <p className="font-display text-lg font-semibold leading-tight tabular-nums">
            {count}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / 10
            </span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {canLog ? "Tap to log" : "View"}
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
      </div>
    </Link>
  );
}
