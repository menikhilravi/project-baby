"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateGearPrice, deleteGearItem } from "../actions";

export function ItemActions({
  id,
  currentPrice,
}: {
  id: string;
  currentPrice: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentPrice));
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        action={(fd) => {
          startTransition(async () => {
            try {
              await updateGearPrice(fd);
              setEditing(false);
            } catch (e) {
              console.error(e);
            }
          });
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="id" value={id} />
        <span className="absolute pointer-events-none pl-2 text-xs text-muted-foreground">
          $
        </span>
        <Input
          name="current_price"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-24 rounded-lg pl-5 text-sm tabular-nums"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending}
          className="h-8 w-8 rounded-lg bg-gear hover:bg-gear/90 text-white"
          aria-label="Save price"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setValue(String(currentPrice));
            setEditing(false);
          }}
          className="h-8 w-8 rounded-lg"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setEditing(true)}
        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
        aria-label="Update price"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <form action={deleteGearItem}>
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
          aria-label="Delete item"
          formNoValidate
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
