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
  // Step markers so we can trace which line was last reached before a
  // production-redacted Server Components render error. Appears in Vercel
  // function logs alongside the digest.
  const TAG = "[nursery-render]";
  console.log(`${TAG} 1 start`);

  const supabase = await createClient();
  console.log(`${TAG} 2 supabase client created`);

  const { count: initial } = await supabase
    .from("nursery_checklist")
    .select("id", { count: "exact", head: true });
  console.log(`${TAG} 3 nursery count=${initial ?? 0}`);
  if ((initial ?? 0) === 0) {
    await seedDefaultList();
    console.log(`${TAG} 3a seeded default list`);
  }

  const { data: rows } = await supabase
    .from("nursery_checklist")
    .select("id, owner, item, checked, sort_order")
    .order("sort_order", { ascending: true });
  console.log(`${TAG} 4 fetched ${rows?.length ?? 0} nursery rows`);

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
    console.log(
      `${TAG} 5 fetched ${shortlistItems.length} shortlist gear_items`,
    );
    if (shortlistGearIds.length > 0) {
      const watchersRes = await supabase
        .from("gear_watchers")
        .select(
          "id, item_id, retailer, url, current_price, last_checked_at, last_checked_status, last_error, is_chosen, sort_order",
        )
        .in("item_id", shortlistGearIds)
        .order("sort_order", { ascending: true });
      if (watchersRes.error) {
        throw new Error(
          `gear_watchers query failed: ${watchersRes.error.message}`,
        );
      }
      shortlistWatchers = (watchersRes.data ?? []) as ShortlistWatcherRow[];
      console.log(`${TAG} 6 fetched ${shortlistWatchers.length} watchers`);
    }
  }
  console.log(`${TAG} 7 data load complete, building maps`);

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
  console.log(`${TAG} 8 ready to render JSX`);

  // Dump the shortlist data so we can see what's being passed down when the
  // render crashes. Limited to shortlists only to keep noise down.
  for (const r of safeRows) {
    if (!r.shortlist) continue;
    console.log(
      `${TAG} 8a row id=${r.id} owner=${r.owner} item="${r.item}" gear=${r.shortlist.gearItemId} opts=${r.shortlist.options.length}`,
    );
    for (const o of r.shortlist.options) {
      console.log(
        `${TAG} 8b   option id=${o.id} retailer="${o.retailer}" price=${JSON.stringify(o.current_price)} status=${o.last_checked_status} chosen=${o.is_chosen}`,
      );
    }
  }

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
