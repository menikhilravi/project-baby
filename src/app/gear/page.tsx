import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { AddItemForm } from "./_components/add-item-form";
import { RefreshButton } from "./_components/refresh-button";
import { TargetHitBanner } from "./_components/target-hit-banner";
import {
  WatchersList,
  type WatcherRow,
} from "./_components/watchers-list";
import { PriceHistorySparkline } from "./_components/price-history-sparkline";
import { SuppliesList, type SupplyRow } from "./_components/supplies-list";
import { removeGearItem } from "./actions";

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

type ItemView = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  target_price: number | null;
  last_target_hit_at: string | null;
  is_target_hit_acknowledged: boolean;
  kind: "registry" | "supplies";
  quantity: number;
  low_threshold: number;
  created_at: string;
  updated_at: string;
  best_price: number | null;
  high_price: number | null;
  watcher_count: number;
};

type HistoryRow = {
  watcher_id: string;
  price: number;
  recorded_at: string;
};

export default async function GearPage() {
  const supabase = await createClient();

  const [itemsRes, watchersRes, historyRes] = await Promise.all([
    supabase
      .from("gear_items_with_best")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("gear_watchers")
      .select(
        "id, item_id, retailer, url, current_price, last_checked_at, last_checked_status, last_error, is_paused",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("gear_price_history")
      .select("watcher_id, price, recorded_at")
      .order("recorded_at", { ascending: true }),
  ]);

  const allItems = (itemsRes.data ?? []) as unknown as ItemView[];
  const items = allItems.filter((i) => i.kind !== "supplies");
  const supplies: SupplyRow[] = allItems
    .filter((i) => i.kind === "supplies")
    .map((i) => ({
      id: i.id,
      name: i.name,
      emoji: i.emoji,
      quantity: i.quantity,
      low_threshold: i.low_threshold,
    }));
  const watchers = watchersRes.data ?? [];
  const history = (historyRes.data ?? []) as unknown as HistoryRow[];

  // Group watchers by item_id
  const watchersByItem = new Map<string, WatcherRow[]>();
  for (const w of watchers) {
    const arr = watchersByItem.get(w.item_id) ?? [];
    arr.push({
      id: w.id,
      retailer: w.retailer,
      url: w.url,
      current_price: w.current_price,
      last_checked_at: w.last_checked_at,
      last_checked_status: w.last_checked_status,
      last_error: w.last_error,
    });
    watchersByItem.set(w.item_id, arr);
  }

  // For each watcher, attach history. Then derive best-price-per-day series per item.
  const historyByWatcher = new Map<string, HistoryRow[]>();
  for (const h of history) {
    const arr = historyByWatcher.get(h.watcher_id) ?? [];
    arr.push(h);
    historyByWatcher.set(h.watcher_id, arr);
  }

  const sparklineByItem = new Map<string, { price: number; recorded_at: string }[]>();
  for (const item of items) {
    const itemWatchers = watchersByItem.get(item.id) ?? [];
    const dailyMin = new Map<string, number>(); // YYYY-MM-DD → min price
    for (const w of itemWatchers) {
      const rows = historyByWatcher.get(w.id) ?? [];
      for (const r of rows) {
        const day = r.recorded_at.slice(0, 10);
        const cur = dailyMin.get(day);
        const p = Number(r.price);
        if (cur === undefined || p < cur) dailyMin.set(day, p);
      }
    }
    const series = [...dailyMin.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, price]) => ({ price, recorded_at: day }));
    sparklineByItem.set(item.id, series);
  }

  // Last refresh time across all watchers
  const lastCheckedAt = watchers
    .map((w) => w.last_checked_at)
    .filter((x): x is string => !!x)
    .sort()
    .pop() ?? null;

  // Target hits (banner)
  const hits = items
    .filter(
      (i) =>
        i.last_target_hit_at !== null &&
        !i.is_target_hit_acknowledged &&
        i.best_price !== null &&
        Number(i.best_price) <= Number(i.target_price),
    )
    .map((i) => {
      const itemWatchers = watchersByItem.get(i.id) ?? [];
      const bestWatcher = itemWatchers
        .filter((w) => w.current_price !== null)
        .sort(
          (a, b) => Number(a.current_price ?? 0) - Number(b.current_price ?? 0),
        )[0];
      return {
        id: i.id,
        name: i.name,
        emoji: i.emoji,
        best_price: Number(i.best_price),
        target_price: Number(i.target_price),
        best_retailer: bestWatcher?.retailer ?? null,
      };
    });

  const isEmpty = items.length === 0;

  const lowCount = supplies.filter(
    (s) => s.low_threshold > 0 && s.quantity <= s.low_threshold,
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="gear"
        icon={ShoppingCart}
        eyebrow="Essentials"
        title="Registry & supplies."
        subtitle="Track big-ticket gear and the consumables you restock — all in one place."
      />

      <Tabs defaultValue="registry" className="mt-2">
        <TabsList className="grid grid-cols-2 w-full bg-card/50 p-1.5 rounded-2xl !h-auto gap-1 mb-5">
          <TabsTrigger
            value="registry"
            className={cn(
              "rounded-xl py-2.5 flex flex-col items-center gap-0.5 !h-auto transition-all",
              "data-active:!bg-muted data-active:!text-foreground data-active:!shadow-sm",
            )}
          >
            <span className="text-sm font-medium">Registry</span>
            <span className="text-[10.5px] text-muted-foreground tabular-nums">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="supplies"
            className={cn(
              "rounded-xl py-2.5 flex flex-col items-center gap-0.5 !h-auto transition-all",
              "data-active:!bg-muted data-active:!text-foreground data-active:!shadow-sm",
            )}
          >
            <span className="text-sm font-medium">
              Supplies
              {lowCount > 0 ? (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold">
                  {lowCount}
                </span>
              ) : null}
            </span>
            <span className="text-[10.5px] text-muted-foreground tabular-nums">
              {supplies.length} {supplies.length === 1 ? "item" : "items"}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry">
          <div className="flex items-center justify-end gap-3 mb-4">
            <RefreshButton lastCheckedAt={lastCheckedAt} />
            <AddItemForm />
          </div>

          <TargetHitBanner hits={hits} />

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
              Paste a product URL — we&apos;ll grab the price and watch it for
              you. Add multiple retailers to find the lowest.
            </p>
            <div className="mt-2">
              <AddItemForm />
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const target = Number(item.target_price);
            const best = item.best_price !== null ? Number(item.best_price) : null;
            const high = item.high_price !== null ? Number(item.high_price) : null;
            const goodTime = best !== null && best <= target;
            const itemWatchers = watchersByItem.get(item.id) ?? [];
            const bestWatcher =
              best !== null
                ? itemWatchers.find(
                    (w) => Number(w.current_price ?? -1) === best,
                  )
                : undefined;

            const range = high !== null ? Math.max(high - target, 1) : 1;
            const progress =
              best !== null && high !== null
                ? Math.max(0, Math.min(100, ((high - best) / range) * 100))
                : 0;

            const series = sparklineByItem.get(item.id) ?? [];

            return (
              <li key={item.id}>
                <Card
                  className={cn(
                    "overflow-hidden transition-all hover:shadow-md",
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
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.watcher_count}{" "}
                              {item.watcher_count === 1
                                ? "retailer"
                                : "retailers"}
                              {bestWatcher ? ` · best at ${bestWatcher.retailer}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium",
                                best === null
                                  ? "bg-muted text-muted-foreground"
                                  : goodTime
                                    ? "bg-hospital-soft text-hospital"
                                    : "bg-names-soft text-names",
                              )}
                            >
                              {best === null ? (
                                <>
                                  <HelpCircle className="h-3 w-3" />
                                  No price yet
                                </>
                              ) : goodTime ? (
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
                            <form action={removeGearItem}>
                              <input type="hidden" name="id" value={item.id} />
                              <Button
                                type="submit"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-md text-muted-foreground/60 hover:text-destructive"
                                aria-label="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </form>
                          </div>
                        </div>

                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                            {best !== null ? fmt(best) : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            target {fmt(target)}
                          </span>
                        </div>

                        {best !== null && high !== null ? (
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
                        ) : null}

                        <div className="mt-3">
                          <PriceHistorySparkline
                            points={series}
                            goodTime={goodTime}
                          />
                        </div>

                        <WatchersList
                          itemId={item.id}
                          watchers={itemWatchers}
                          bestPrice={best}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
        </TabsContent>

        <TabsContent value="supplies">
          <SuppliesList rows={supplies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
