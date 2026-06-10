import { BriefcaseMedical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { ownerCopy, type Owner } from "@/data/default-checklist";
import { seedDefaultList } from "./actions";
import {
  ChecklistGroup,
  type ChecklistRow,
} from "./_components/checklist-group";
import { cn } from "@/lib/utils";

export default async function HospitalPage() {
  const supabase = await createClient();

  // Auto-seed on first visit.
  const { count: initial } = await supabase
    .from("hospital_checklist")
    .select("id", { count: "exact", head: true });
  if ((initial ?? 0) === 0) {
    await seedDefaultList();
  }

  const { data: rows } = await supabase
    .from("hospital_checklist")
    .select("id, owner, item, checked, sort_order")
    .order("sort_order", { ascending: true });

  const safeRows: ChecklistRow[] = (rows ?? []) as ChecklistRow[];

  const byOwner: Record<Owner, ChecklistRow[]> = {
    mom: [],
    dad: [],
    baby: [],
  };
  for (const r of safeRows) byOwner[r.owner].push(r);

  const counts = (Object.keys(byOwner) as Owner[]).reduce(
    (acc, owner) => {
      const total = byOwner[owner].length;
      const done = byOwner[owner].filter((r) => r.checked).length;
      acc[owner] = { done, total };
      return acc;
    },
    {} as Record<Owner, { done: number; total: number }>,
  );

  const totalDone = Object.values(counts).reduce((n, c) => n + c.done, 0);
  const totalAll = Object.values(counts).reduce((n, c) => n + c.total, 0);
  const overall = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <div className="mx-auto max-w-xl px-5 py-10 md:px-8 md:py-16">
      <PageHero
        tool="hospital"
        icon={BriefcaseMedical}
        eyebrow="Go Bag"
        title="Pack with confidence."
        subtitle="A gentle nudge so nothing gets forgotten on the big day."
      />

      <div className="mb-8">
        <div className="flex items-end justify-between mb-2.5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
              Packed
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
            className="h-full rounded-full bg-hospital transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <Tabs defaultValue="mom">
        <TabsList className="w-full justify-start gap-7 border-b border-border rounded-none bg-transparent p-0 mb-6 h-auto">
          {(Object.keys(byOwner) as Owner[]).map((owner) => {
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
                  <span aria-hidden>{ownerCopy[owner].emoji}</span>
                  {ownerCopy[owner].label}
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      complete ? "text-hospital" : "text-muted-foreground/70",
                    )}
                  >
                    {done}/{total}
                  </span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(byOwner) as Owner[]).map((owner) => (
          <TabsContent key={owner} value={owner}>
            <ChecklistGroup owner={owner} rows={byOwner[owner]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
