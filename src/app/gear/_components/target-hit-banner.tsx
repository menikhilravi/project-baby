import { PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acknowledgeTargetHit } from "../actions";

type Hit = {
  id: string;
  name: string;
  emoji: string;
  best_price: number;
  target_price: number;
  best_retailer: string | null;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export function TargetHitBanner({ hits }: { hits: Hit[] }) {
  if (hits.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {hits.map((hit) => (
        <div
          key={hit.id}
          className="flex items-start gap-3 rounded-2xl border border-hospital/30 bg-hospital-soft/70 p-4"
        >
          <PartyPopper className="h-5 w-5 text-hospital mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">
              <span aria-hidden className="mr-1.5">
                {hit.emoji}
              </span>
              {hit.name} hit your target
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(hit.best_price)} · target {fmt(hit.target_price)}
              {hit.best_retailer ? ` · via ${hit.best_retailer}` : ""}
            </p>
          </div>
          <form action={acknowledgeTargetHit}>
            <input type="hidden" name="id" value={hit.id} />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              aria-label="Dismiss"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      ))}
    </div>
  );
}
