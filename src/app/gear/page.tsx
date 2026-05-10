import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/page-hero";

type GearItem = {
  emoji: string;
  name: string;
  retailer: string;
  current: number;
  target: number;
  high: number;
};

const items: GearItem[] = [
  {
    emoji: "🛒",
    name: "UPPAbaby Vista Stroller",
    retailer: "Babylist",
    current: 899,
    target: 750,
    high: 1099,
  },
  {
    emoji: "🚗",
    name: "Nuna PIPA Car Seat",
    retailer: "Nordstrom",
    current: 349,
    target: 300,
    high: 399,
  },
  {
    emoji: "🌙",
    name: "Snoo Smart Bassinet",
    retailer: "Happiest Baby",
    current: 1095,
    target: 1100,
    high: 1695,
  },
];

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function GearPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="gear"
        icon={ShoppingCart}
        eyebrow="Price Pulse"
        title="Gear at the right price."
        subtitle="We watch retailers so you don’t have to. Set a target, get a nudge when it’s time."
      />

      <ul className="space-y-4">
        {items.map((item) => {
          const goodTime = item.current <= item.target;
          // progress: how close current is to target, relative to historical high
          const range = Math.max(item.high - item.target, 1);
          const progress = Math.max(
            0,
            Math.min(100, ((item.high - item.current) / range) * 100),
          );
          return (
            <li key={item.name}>
              <Card
                className={cn(
                  "overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md",
                  goodTime && "ring-1 ring-hospital/30",
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className="grid place-items-center h-12 w-12 rounded-2xl bg-gear-soft text-2xl shadow-inner"
                    >
                      {item.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium leading-tight truncate">
                            {item.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.retailer}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium shrink-0",
                            goodTime
                              ? "bg-hospital-soft text-hospital"
                              : "bg-names-soft text-names",
                          )}
                        >
                          {goodTime ? (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              Good time to buy
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              Wait
                            </>
                          )}
                        </span>
                      </div>

                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                          {fmt(item.current)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          target {fmt(item.target)}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              goodTime ? "bg-hospital" : "bg-gear",
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                          <span>high {fmt(item.high)}</span>
                          <span>{Math.round(progress)}% to target</span>
                          <span>target {fmt(item.target)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
