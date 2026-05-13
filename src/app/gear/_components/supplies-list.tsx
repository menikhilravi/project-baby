"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Minus, Plus, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  adjustSupplyQuantity,
  removeGearItem,
  updateSupply,
  addSupplyItem,
} from "../actions";

export type SupplyRow = {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  low_threshold: number;
};

export function SuppliesList({ rows }: { rows: SupplyRow[] }) {
  const [optimistic, applyPatch] = useOptimistic<
    SupplyRow[],
    | { kind: "qty"; id: string; quantity: number }
    | { kind: "remove"; id: string }
  >(rows, (state, p) => {
    if (p.kind === "qty") {
      return state.map((r) =>
        r.id === p.id ? { ...r, quantity: p.quantity } : r,
      );
    }
    if (p.kind === "remove") return state.filter((r) => r.id !== p.id);
    return state;
  });

  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAdjust = (row: SupplyRow, delta: number) => {
    const next = Math.max(0, row.quantity + delta);
    startTransition(async () => {
      applyPatch({ kind: "qty", id: row.id, quantity: next });
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("delta", String(delta));
      try {
        await adjustSupplyQuantity(fd);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleRemove = (row: SupplyRow) => {
    if (!confirm(`Remove ${row.name}?`)) return;
    startTransition(async () => {
      applyPatch({ kind: "remove", id: row.id });
      const fd = new FormData();
      fd.set("id", row.id);
      try {
        await removeGearItem(fd);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const lowCount = optimistic.filter(
    (r) => r.low_threshold > 0 && r.quantity <= r.low_threshold,
  ).length;

  return (
    <div className="space-y-4">
      {lowCount > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-destructive font-medium">
            {lowCount} {lowCount === 1 ? "supply is" : "supplies are"} running low
          </span>
        </div>
      ) : null}

      {optimistic.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No supplies yet. Add diapers, wipes, formula — anything you restock.
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gear hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add the first supply
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {optimistic.map((row) => {
            const low = row.low_threshold > 0 && row.quantity <= row.low_threshold;
            return (
              <li key={row.id}>
                {editingId === row.id ? (
                  <EditCard row={row} onDone={() => setEditingId(null)} />
                ) : (
                  <SupplyCard
                    row={row}
                    low={low}
                    onMinus={() => handleAdjust(row, -1)}
                    onPlus={() => handleAdjust(row, +1)}
                    onEdit={() => setEditingId(row.id)}
                    onRemove={() => handleRemove(row)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <AddSupplyForm onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-transparent py-3 text-xs text-muted-foreground hover:text-foreground hover:border-gear/40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add supply
        </button>
      )}
    </div>
  );
}

function SupplyCard({
  row,
  low,
  onMinus,
  onPlus,
  onEdit,
  onRemove,
}: {
  row: SupplyRow;
  low: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border bg-card px-3 py-3 transition-all",
        low && "border-destructive/40 bg-destructive/5",
      )}
    >
      <span
        aria-hidden
        className="grid place-items-center h-11 w-11 rounded-2xl bg-gear-soft text-xl shrink-0 shadow-inner"
      >
        {row.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{row.name}</p>
          {low ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-[10px] font-medium">
              <AlertTriangle className="h-2.5 w-2.5" />
              Low
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {row.low_threshold > 0
            ? `Warn below ${row.low_threshold}`
            : "No low-stock alert"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onMinus}
          disabled={row.quantity === 0}
          className="h-8 w-8 rounded-lg"
          aria-label="Decrease"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span
          className={cn(
            "min-w-[2ch] text-center font-display text-lg font-semibold tabular-nums",
            low && "text-destructive",
          )}
        >
          {row.quantity}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onPlus}
          className="h-8 w-8 rounded-lg"
          aria-label="Increase"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-0.5 ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onEdit}
          className="h-7 w-7 rounded-md text-muted-foreground/60 hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-7 w-7 rounded-md text-muted-foreground/60 hover:text-destructive"
          aria-label="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EditCard({
  row,
  onDone,
}: {
  row: SupplyRow;
  onDone: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [threshold, setThreshold] = useState(row.low_threshold);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("name", name);
      fd.set("low_threshold", String(threshold));
      try {
        await updateSupply(fd);
        onDone();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="rounded-2xl border bg-card px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center h-11 w-11 rounded-2xl bg-gear-soft text-xl shrink-0">
          {row.emoji}
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl"
          placeholder="Name"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground shrink-0">
          Warn when below
        </Label>
        <Input
          type="number"
          min={0}
          value={threshold}
          onChange={(e) =>
            setThreshold(Math.max(0, parseInt(e.target.value || "0", 10)))
          }
          className="rounded-xl w-20 text-center"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={pending}
          className="bg-gear hover:bg-gear/90 text-white"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function AddSupplyForm({ onDone }: { onDone: () => void }) {
  const [emoji, setEmoji] = useState("📦");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("emoji", emoji);
      fd.set("quantity", String(quantity));
      fd.set("low_threshold", String(threshold));
      try {
        await addSupplyItem(fd);
        onDone();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border bg-card px-3 py-3 space-y-2.5"
    >
      <div className="flex items-center gap-2">
        <Input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2) || "📦")}
          className="rounded-xl w-14 text-center text-xl"
          maxLength={2}
        />
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Diapers, wipes, formula…"
          className="rounded-xl flex-1"
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-xs text-muted-foreground shrink-0">
            Have
          </Label>
          <Input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(0, parseInt(e.target.value || "0", 10)))
            }
            className="rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-xs text-muted-foreground shrink-0">
            Warn below
          </Label>
          <Input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) =>
              setThreshold(Math.max(0, parseInt(e.target.value || "0", 10)))
            }
            className="rounded-xl"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !name.trim()}
          className="bg-gear hover:bg-gear/90 text-white"
        >
          Add
        </Button>
      </div>
    </form>
  );
}
