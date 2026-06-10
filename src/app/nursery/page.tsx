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
  // candidate watchers, so we can render the comparison UI inline. Keyed
  // as strings throughout because Supabase returns bigint as a JS string
  // in some cases and we don't want a Map miss from "42" !== 42.
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
    title: string | null;
    image_url: string | null;
  };

  const nurseryIds = (rows ?? []).map((r) => r.id);
  let shortlistItems: { id: string; nursery_item_id: number | string }[] = [];
  let shortlistWatchers: ShortlistWatcherRow[] = [];
  if (nurseryIds.length > 0) {
    const itemsRes = await supabase
      .from("gear_items")
      .select("id, nursery_item_id")
      .in("nursery_item_id", nurseryIds)
      .eq("kind", "shortlist");
    if (itemsRes.error) {
      throw new Error(`gear_items query failed: ${itemsRes.error.message}`);
    }
    shortlistItems = (itemsRes.data ?? []) as typeof shortlistItems;

    const shortlistGearIds = shortlistItems.map((i) => i.id);
    if (shortlistGearIds.length > 0) {
      const watchersRes = await supabase
        .from("gear_watchers")
        .select(
          "id, item_id, retailer, url, current_price, last_checked_at, last_checked_status, last_error, is_chosen, sort_order, title, image_url",
        )
        .in("item_id", shortlistGearIds)
        .order("sort_order", { ascending: true });
      if (watchersRes.error) {
        throw new Error(
          `gear_watchers query failed: ${watchersRes.error.message}`,
        );
      }
      shortlistWatchers = (watchersRes.data ?? []) as ShortlistWatcherRow[];
    }
  }

  const watchersByGearId = new Map<string, ShortlistWatcherRow[]>();
  for (const w of shortlistWatchers) {
    const key = String(w.item_id);
    const arr = watchersByGearId.get(key) ?? [];
    arr.push(w);
    watchersByGearId.set(key, arr);
  }

  // Key on string form of nursery_item_id (handles bigint returned as string).
  const shortlistByNurseryId = new Map<
    string,
    { gearItemId: string; watchers: ShortlistWatcherRow[] }
  >();
  for (const item of shortlistItems) {
    if (item.nursery_item_id == null) continue;
    shortlistByNurseryId.set(String(item.nursery_item_id), {
      gearItemId: item.id,
      watchers: watchersByGearId.get(item.id) ?? [],
    });
  }

  const safeRows: ChecklistRow[] = (rows ?? []).map((r) => {
    const sl = shortlistByNurseryId.get(String(r.id));
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
              title: w.title,
              image_url: w.image_url,
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
  for (const r of safeRows) {
    if (r.owner in byOwner) byOwner[r.owner].push(r);
  }

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
    <div className="mx-auto max-w-xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="nursery"
        icon={Baby}
        eyebrow="Baby Nest"
        title="Get the nest ready."
        subtitle="Check off every room, safety, and supply task before the big day."
      />

      <div className="mb-8">
        <div className="flex items-end justify-between mb-2.5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
              Ready
            </p>
            <p className="font-display nums text-4xl font-bold tracking-tight mt-1.5">
              {overall}
              <span className="text-2xl text-muted-foreground">%</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {totalDone} / {totalAll}
          </p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-nursery transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <Tabs defaultValue="room">
        <TabsList className="w-full justify-start gap-7 border-b border-border rounded-none bg-transparent p-0 mb-6 h-auto">
          {(Object.keys(byOwner) as NurseryOwner[]).map((owner) => {
            const { done, total } = counts[owner];
            const complete = total > 0 && done === total;
            return (
              <TabsTrigger
                key={owner}
                value={owner}
                className={cn(
                  "flex-none rounded-none bg-transparent border-0 border-b-2 border-transparent px-0 pb-2.5 -mb-px text-[15px] font-medium text-muted-foreground transition-colors",
                  "hover:text-foreground data-active:text-foreground data-active:border-foreground data-active:bg-transparent data-active:shadow-none",
                  "dark:data-active:bg-transparent dark:data-active:border-foreground",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>{nurseryOwnerCopy[owner].emoji}</span>
                  {nurseryOwnerCopy[owner].label}
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      complete ? "text-nursery" : "text-muted-foreground/70",
                    )}
                  >
                    {done}/{total}
                  </span>
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
