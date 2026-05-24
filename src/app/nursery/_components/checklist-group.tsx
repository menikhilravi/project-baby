"use client";

import { useOptimistic, useState, useTransition, useRef } from "react";
import { Plus, Check, Trash2, ShoppingBag, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NurseryOwner } from "@/data/default-nursery-checklist";
import {
  toggleItem,
  addCustomItem,
  removeItem,
  createShortlistFromNursery,
} from "../actions";
import {
  WatchersList,
  type WatcherRow,
} from "@/app/gear/_components/watchers-list";

export type ChecklistRow = {
  id: number;
  owner: NurseryOwner;
  item: string;
  checked: boolean;
  sort_order: number;
  shortlist?: {
    gearItemId: string;
    options: WatcherRow[];
  };
};

type Patch =
  | { kind: "toggle"; id: number; checked: boolean }
  | { kind: "remove"; id: number }
  | { kind: "add"; tempId: number; owner: NurseryOwner; item: string };

export function ChecklistGroup({
  owner,
  rows,
}: {
  owner: NurseryOwner;
  rows: ChecklistRow[];
}) {
  if (typeof window === "undefined") {
    console.log(
      `[checklist-group SSR] owner=${owner} rows=${rows.length} shortlists=${rows.filter((r) => r.shortlist).length}`,
    );
  }
  const [optimisticRows, applyPatch] = useOptimistic<ChecklistRow[], Patch>(
    rows,
    (state, patch) => {
      switch (patch.kind) {
        case "toggle":
          return state.map((r) =>
            r.id === patch.id ? { ...r, checked: patch.checked } : r,
          );
        case "remove":
          return state.filter((r) => r.id !== patch.id);
        case "add":
          return [
            ...state,
            {
              id: patch.tempId,
              owner: patch.owner,
              item: patch.item,
              checked: false,
              sort_order: state.length,
            },
          ];
      }
    },
  );
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    // Auto-expand any row that already has candidates so the user sees them
    // without an extra click on first load.
    const s = new Set<number>();
    for (const r of rows) {
      if (r.shortlist && r.shortlist.options.length > 0) s.add(r.id);
    }
    return s;
  });

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBag = (row: ChecklistRow) => {
    if (row.shortlist) {
      toggleExpanded(row.id);
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("nursery_item_id", String(row.id));
        await createShortlistFromNursery(fd);
        setExpanded((prev) => new Set(prev).add(row.id));
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleToggle = (row: ChecklistRow) => {
    startTransition(async () => {
      applyPatch({ kind: "toggle", id: row.id, checked: !row.checked });
      try {
        await toggleItem(row.id, !row.checked);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleRemove = (row: ChecklistRow) => {
    startTransition(async () => {
      applyPatch({ kind: "remove", id: row.id });
      try {
        await removeItem(row.id);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    const tempId = -Date.now();
    startTransition(async () => {
      applyPatch({ kind: "add", tempId, owner, item: value });
      const fd = new FormData();
      fd.append("owner", owner);
      fd.append("item", value);
      try {
        await addCustomItem(fd);
        setDraft("");
        setAdding(false);
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <ul className="space-y-2.5 mt-5">
      {optimisticRows.map((row) => {
        const optionCount = row.shortlist?.options.length ?? 0;
        const isExpanded = !!row.shortlist && expanded.has(row.id);
        return (
          <li key={row.id}>
            <div
              className={cn(
                "group flex items-center gap-3 rounded-2xl border bg-card pl-4 pr-2 py-3 transition-all",
                "hover:border-nursery/40 hover:shadow-sm",
                row.checked && "bg-nursery-soft/60 border-nursery/30",
                isExpanded && "rounded-b-none border-b-0",
              )}
            >
              <Checkbox
                id={`item-${row.id}`}
                checked={row.checked}
                onCheckedChange={() => handleToggle(row)}
                className={cn(
                  "data-[state=checked]:bg-nursery data-[state=checked]:border-nursery",
                  "data-[state=checked]:text-white",
                )}
              />
              <Label
                htmlFor={`item-${row.id}`}
                className={cn(
                  "text-sm font-normal cursor-pointer flex-1 py-1",
                  row.checked && "line-through text-muted-foreground",
                )}
              >
                {row.item}
              </Label>
              {row.checked ? (
                <Check className="h-4 w-4 text-nursery mr-1" />
              ) : null}
              {row.id > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleBag(row)}
                  className={cn(
                    "h-8 gap-1.5 px-2 rounded-lg text-muted-foreground/60 hover:text-gear hover:bg-gear-soft/40",
                    row.shortlist && "text-gear",
                  )}
                  aria-label={
                    row.shortlist
                      ? `Toggle options for ${row.item}`
                      : `Shop options for ${row.item}`
                  }
                  title={row.shortlist ? "Toggle options" : "Shop options"}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {optionCount > 0 ? (
                    <span className="text-[11px] font-medium tabular-nums">
                      {optionCount}
                    </span>
                  ) : null}
                  {row.shortlist ? (
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  ) : null}
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(row)}
                className="h-8 w-8 rounded-lg text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${row.item}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {isExpanded && row.shortlist ? (
              <div className="rounded-b-2xl border border-t-0 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
                {/* DEBUG: bypassing WatchersList to test if it's the recursion source */}
                <p>Options ({row.shortlist.options.length}):</p>
                <ul className="mt-2 space-y-1">
                  {row.shortlist.options.map((o) => (
                    <li key={o.id}>
                      {o.retailer} — {o.current_price ?? "no price"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}

      <li>
        {adding ? (
          <form
            onSubmit={handleAdd}
            className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2"
          >
            <Input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (!draft.trim()) setAdding(false);
              }}
              placeholder="Add an item…"
              className="flex-1 h-8 border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent"
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-lg bg-nursery hover:bg-nursery/90 text-white"
            >
              Add
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-transparent py-3 text-xs text-muted-foreground hover:text-foreground hover:border-nursery/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        )}
      </li>
    </ul>
  );
}
