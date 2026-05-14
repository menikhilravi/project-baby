import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type LowSupply = {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  low_threshold: number;
};

export function LowSuppliesCard({ supplies }: { supplies: LowSupply[] }) {
  const empties = supplies.filter((s) => s.quantity === 0).length;

  return (
    <Link
      href="/gear"
      className={cn(
        "block rounded-2xl border border-destructive/30 bg-destructive/5 p-4 transition-all",
        "hover:bg-destructive/10 hover:border-destructive/50",
      )}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm font-medium text-destructive flex-1">
          {supplies.length} {supplies.length === 1 ? "supply is" : "supplies are"} running low
          {empties > 0 ? ` · ${empties} out` : null}
        </p>
        <ChevronRight className="h-4 w-4 text-destructive/60" />
      </div>
      <ul className="space-y-1">
        {supplies.slice(0, 5).map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2.5 text-sm rounded-xl bg-card/40 px-2.5 py-1.5"
          >
            <span aria-hidden className="text-base">
              {s.emoji}
            </span>
            <span className="flex-1 truncate">{s.name}</span>
            <span
              className={cn(
                "text-xs tabular-nums font-medium",
                s.quantity === 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {s.quantity} left
            </span>
          </li>
        ))}
        {supplies.length > 5 ? (
          <li className="text-[11px] text-muted-foreground pl-2.5 pt-1">
            and {supplies.length - 5} more…
          </li>
        ) : null}
      </ul>
    </Link>
  );
}
