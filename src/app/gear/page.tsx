import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, ShoppingCart, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { AddItemForm } from "./_components/add-item-form";
import { ItemActions } from "./_components/update-price-button";
import { PriceHistorySparkline } from "./_components/price-history-sparkline";

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default async function GearPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: history }] = await Promise.all([
    supabase
      .from("gear_items")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("gear_price_history")
      .select("item_id, price, recorded_at")
      .order("recorded_at", { ascending: true }),
  ]);

  const historyByItem = new Map<string, { price: number; recorded_at: string }[]>();
  for (const row of history ?? []) {
    const arr = historyByItem.get(row.item_id) ?? [];
    arr.push({ price: Number(row.price), recorded_at: row.recorded_at });
    historyByItem.set(row.item_id, arr);
  }

  const isEmpty = !items || items.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <div className="flex items-start justify-between gap-4 mb-7">
        <PageHero
          tool="gear"
          icon={ShoppingCart}
          eyebrow="Price Pulse"
          title="Gear at the right price."
          subtitle="Track each item, update the price as you spot it. We'll keep the history."
        />
        <div className="pt-2 shrink-0">
          <AddItemForm />
        </div>
      </div>

      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <span className="text-4xl" aria-hidden>
              🛒
            </span>
            <h3 className="font-display text-xl font-semibold">
              No items tracked yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add your first piece of gear with its current and target price.
              Update it whenever you spot a new price — we&apos;ll show you the
              trend.
            </p>
            <div className="mt-2">
              <AddItemForm />
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {items!.map((item) => {
            const current = Number(item.current_price);
            const target = Number(item.target_price);
            const high = Number(item.high_price ?? current);
            const goodTime = current <= target;
            const range = Math.max(high - target, 1);
            const progress = Math.max(
              0,
              Math.min(100, ((high - current) / range) * 100),
            );
            const points = historyByItem.get(item.id) ?? [];
            return (
              <li key={item.id}>
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
                        className="grid place-items-center h-12 w-12 rounded-2xl bg-gear-soft text-2xl shadow-inner shrink-0"
                      >
                        {item.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium leading-tight truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              {item.retailer ?? "—"}
                              {item.url ? (
                                <Link
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center hover:text-foreground"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : null}
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

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                              {fmt(current)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              target {fmt(target)}
                            </span>
                          </div>
                          <ItemActions id={item.id} currentPrice={current} />
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
                            <span>high {fmt(high)}</span>
                            <span>{Math.round(progress)}% to target</span>
                            <span>target {fmt(target)}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/60">
                          <PriceHistorySparkline
                            points={points}
                            goodTime={goodTime}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
