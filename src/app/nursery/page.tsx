import { Baby } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { nurseryOwnerCopy, type NurseryOwner } from "@/data/default-nursery-checklist";
import { seedDefaultList } from "./actions";
import {
  ChecklistGroup,
  type ChecklistRow,
} from "./_components/checklist-group";
import { cn } from "@/lib/utils";

export default async function NurseryPage() {
  const supabase = await createClient();

  const { count: initial } = await supabase
    .from("nursery_checklist")
    .select("id", { count: "exact", head: true });
  if ((initial ?? 0) === 0) {
    await seedDefaultList();
  }

  const { data: rows } = await supabase
    .from("nursery_checklist")
    .select("id, owner, item, checked, sort_order")
    .order("sort_order", { ascending: true });

  // Pull any shortlist gear_items linked to these nursery rows + their
  // candidate watchers, so we can render the comparison UI inline.
  type ShortlistWatcherRow = {
    id: string;
    item_id: string;
    retailer: string;
    url: string;
    current_price: number | null;
    last_checked_at: string | null;
    last_checked_status: "pending" | "ok" | "failed";
    last_error: string | null;
    is_chosen: boolean;
    sort_order: number;
  };

  const nurseryIds = (rows ?? []).map((r) => r.id);
  let shortlistItems: { id: string; nursery_item_id: number }[] = [];
  let shortlistWatchers: ShortlistWatcherRow[] = [];
  if (nurseryIds.length > 0) {
    const [itemsRes, watchersRes] = await Promise.all([
      supabase
        .from("gear_items")
        .select("id, nursery_item_id")
        .in("nursery_item_id", nurseryIds)
        .eq("kind", "shortlist"),
      supabase
        .from("gear_watchers")
        .select(
          "id, item_id, retailer, url, current_price, last_checked_at, last_checked_status, last_error, is_chosen, sort_order",
        )
        .order("sort_order", { ascending: true }),
    ]);
    shortlistItems = (itemsRes.data ?? []) as typeof shortlistItems;
    shortlistWatchers = (watchersRes.data ?? []) as ShortlistWatcherRow[];
  }

  const watchersByGearId = new Map<string, ShortlistWatcherRow[]>();
  for (const w of shortlistWatchers) {
    const arr = watchersByGearId.get(w.item_id) ?? [];
    arr.push(w);
    watchersByGearId.set(w.item_id, arr);
  }

  const shortlistByNurseryId = new Map<
    number,
    { gearItemId: string; watchers: ShortlistWatcherRow[] }
  >();
  for (const item of shortlistItems) {
    shortlistByNurseryId.set(item.nursery_item_id, {
      gearItemId: item.id,
      watchers: watchersByGearId.get(item.id) ?? [],
    });
  }

  const safeRows: ChecklistRow[] = (rows ?? []).map((r) => {
    const sl = shortlistByNurseryId.get(r.id);
    return {
      ...(r as ChecklistRow),
      shortlist: sl
        ? {
            gearItemId: sl.gearItemId,
            options: sl.watchers.map((w) => ({
              id: w.id,
              retailer: w.retailer,
              url: w.url,
              current_price: w.current_price,
              last_checked_at: w.last_checked_at,
              last_checked_status: w.last_checked_status,
              last_error: w.last_error,
              is_chosen: w.is_chosen,
            })),
          }
        : undefined,
    };
  });

  const byOwner: Record<NurseryOwner, ChecklistRow[]> = {
    room: [],
    safety: [],
    supplies: [],
  };
  for (const r of safeRows) byOwner[r.owner].push(r);

  const counts = (Object.keys(byOwner) as NurseryOwner[]).reduce(
    (acc, owner) => {
      const total = byOwner[owner].length;
      const done = byOwner[owner].filter((r) => r.checked).length;
      acc[owner] = { done, total };
      return acc;
    },
    {} as Record<NurseryOwner, { done: number; total: number }>,
  );

  const totalDone = Object.values(counts).reduce((n, c) => n + c.done, 0);
  const totalAll = Object.values(counts).reduce((n, c) => n + c.total, 0);
  const overall = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="nursery"
        icon={Baby}
        eyebrow="Baby Nest"
        title="Get the nest ready."
        subtitle="Check off every room, safety, and supply task before the big day."
      />

      <div className="mb-6 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall progress</span>
          <span className="font-medium tabular-nums">
            {totalDone} / {totalAll} done
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-nursery transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <Tabs defaultValue="room">
        <TabsList className="grid grid-cols-3 w-full bg-card/50 p-1.5 rounded-2xl !h-auto gap-1">
          {(Object.keys(byOwner) as NurseryOwner[]).map((owner) => {
            const { done, total } = counts[owner];
            const complete = total > 0 && done === total;
            return (
              <TabsTrigger
                key={owner}
                value={owner}
                className={cn(
                  "rounded-xl py-2.5 flex flex-col items-center gap-0.5 !h-auto transition-all",
                  "data-active:!bg-muted data-active:!text-foreground data-active:!shadow-sm",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span aria-hidden>{nurseryOwnerCopy[owner].emoji}</span>
                  {nurseryOwnerCopy[owner].label}
                </span>
                <span
                  className={cn(
                    "text-[10.5px] tabular-nums",
                    complete ? "text-nursery" : "text-muted-foreground",
                  )}
                >
                  {done}/{total}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(byOwner) as NurseryOwner[]).map((owner) => (
          <TabsContent key={owner} value={owner}>
            <ChecklistGroup owner={owner} rows={byOwner[owner]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
