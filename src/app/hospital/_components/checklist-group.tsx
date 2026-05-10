"use client";

import { useOptimistic, useState, useTransition, useRef } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Owner } from "@/data/default-checklist";
import { toggleItem, addCustomItem, removeItem } from "../actions";

export type ChecklistRow = {
  id: number;
  owner: Owner;
  item: string;
  checked: boolean;
  sort_order: number;
};

type Patch =
  | { kind: "toggle"; id: number; checked: boolean }
  | { kind: "remove"; id: number }
  | { kind: "add"; tempId: number; owner: Owner; item: string };

export function ChecklistGroup({
  owner,
  rows,
}: {
  owner: Owner;
  rows: ChecklistRow[];
}) {
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
      {optimisticRows.map((row) => (
        <li key={row.id}>
          <div
            className={cn(
              "group flex items-center gap-3 rounded-2xl border bg-card pl-4 pr-2 py-3 transition-all",
              "hover:border-hospital/40 hover:shadow-sm",
              row.checked && "bg-hospital-soft/60 border-hospital/30",
            )}
          >
            <Checkbox
              id={`item-${row.id}`}
              checked={row.checked}
              onCheckedChange={() => handleToggle(row)}
              className={cn(
                "data-[state=checked]:bg-hospital data-[state=checked]:border-hospital",
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
              <Check className="h-4 w-4 text-hospital mr-1" />
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
        </li>
      ))}

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
              className="h-8 rounded-lg bg-hospital hover:bg-hospital/90 text-white"
            >
              Add
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-transparent py-3 text-xs text-muted-foreground hover:text-foreground hover:border-hospital/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        )}
      </li>
    </ul>
  );
}
