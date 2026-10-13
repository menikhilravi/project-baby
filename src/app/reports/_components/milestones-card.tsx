"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import { Plus, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { toast } from "@/lib/toast";
import { APP_LOCALE, ymdIn } from "@/lib/time-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/mascot/empty-state";
import { useCelebrate } from "@/components/celebrate/celebrate-provider";
import { useTimeZone } from "@/components/providers/time-zone";
import { addMilestone, removeMilestone } from "../growth-actions";

export type MilestoneRow = {
  id: number;
  notes: string | null;
  occurred_at: string;
};

const SUGGESTIONS = [
  "First smile",
  "First laugh",
  "Held head up",
  "Rolled over",
  "First bath",
  "Sat up",
  "First tooth",
  "Crawled",
  "First steps",
];

/** A keepsake timeline of "firsts" — each one gets a little celebration. */
export function MilestonesCard({ milestones }: { milestones: MilestoneRow[] }) {
  const [adding, setAdding] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();
  const { tz, ready } = useTimeZone();
  const rows = [...milestones]
    .filter((r) => !hidden.has(r.id))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const remove = (row: MilestoneRow) => {
    setHidden((h) => new Set(h).add(row.id));
    startTransition(async () => {
      try {
        await removeMilestone(row.id);
        toast.log(`“${row.notes ?? "Milestone"}” removed`, {
          kind: "milestone",
          undo: () => addMilestone(row.notes ?? "Milestone", ymdIn(new Date(row.occurred_at), tz)),
        });
      } catch (err) {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(row.id);
          return n;
        });
        toast.error("Couldn't remove that", err instanceof Error ? err.message : undefined);
      }
    });
  };

  return (
    <section className="rounded-card border border-border/60 bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-kind-milestone-soft text-kind-milestone-strong">
          <Star className="h-5 w-5 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-tight">Little firsts</h2>
          <p className="text-xs text-muted-foreground">
            {rows.length ? `${rows.length} milestone${rows.length === 1 ? "" : "s"} so far` : "Capture the moments"}
          </p>
        </div>
        <Button variant="squish" onClick={() => setAdding(true)} className="rounded-full px-4">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          compact
          mood="happy"
          title="No firsts yet"
          body="The first smile, first roll, first bath… they go by fast."
        />
      ) : (
        <ol className="relative ml-4 border-l-2 border-dashed border-kind-milestone/40 pl-6">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <m.li
                key={row.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={spring.gentle}
                className="group relative mb-4 last:mb-0"
              >
                <span className="absolute -left-[2.35rem] top-0.5 grid h-7 w-7 place-items-center rounded-full bg-kind-milestone text-[oklch(0.3_0.06_80)] shadow-soft ring-4 ring-card">
                  <Star className="h-3.5 w-3.5 fill-current" />
                </span>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold leading-tight">{row.notes}</p>
                    <p className="text-xs text-muted-foreground nums">
                      {ready
                        ? new Date(row.occurred_at).toLocaleDateString(APP_LOCALE, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: tz,
                          })
                        : " "}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${row.notes}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </m.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      {adding ? <AddMilestoneSheet onClose={() => setAdding(false)} existing={rows.map((r) => r.notes ?? "")} /> : null}
    </section>
  );
}

function AddMilestoneSheet({ onClose, existing }: { onClose: () => void; existing: string[] }) {
  const { tz } = useTimeZone();
  const today = ymdIn(new Date(), tz);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const celebrate = useCelebrate();
  const taken = new Set(existing.map((e) => e.toLowerCase()));

  const submit = () => {
    setError(null);
    if (!label.trim()) {
      setError("Add a short description.");
      return;
    }
    startTransition(async () => {
      try {
        await addMilestone(label, date);
        celebrate("milestone", { word: label.trim().length <= 16 ? `${label.trim()}!` : "A first!", mood: "celebrate" });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title="A new first!" description="Pick one or write your own.">
      <div className="space-y-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setLabel(s)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
                label === s
                  ? "border-transparent bg-kind-milestone-soft text-kind-milestone-strong ring-2 ring-kind-milestone/50"
                  : "bg-card hover:bg-muted",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <Input placeholder="First smile" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
        <label className="block space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">When</span>
          <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="max-w-48" />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button variant="squish" size="xl" className="w-full" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Celebrate it"}
        </Button>
      </div>
    </Sheet>
  );
}
