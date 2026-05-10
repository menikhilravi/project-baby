"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addGearItem } from "../actions";

export function AddItemForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="rounded-full bg-gear hover:bg-gear/90 text-white shadow-sm"
          />
        }
      >
        <Plus className="h-4 w-4" />
        Add gear
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Track a new item
          </DialogTitle>
          <DialogDescription>
            Paste the current price and your target — we&apos;ll keep the
            history.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              try {
                await addGearItem(fd);
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to add");
              }
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="UPPAbaby Vista Stroller"
              className="rounded-xl bg-background/60"
            />
          </div>

          <div className="grid grid-cols-[5rem,1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emoji" className="text-sm">
                Emoji
              </Label>
              <Input
                id="emoji"
                name="emoji"
                defaultValue="🛒"
                maxLength={4}
                className="rounded-xl bg-background/60 text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retailer" className="text-sm">
                Retailer
              </Label>
              <Input
                id="retailer"
                name="retailer"
                placeholder="Babylist"
                className="rounded-xl bg-background/60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-sm">
              URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://"
              className="rounded-xl bg-background/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="current_price" className="text-sm">
                Current price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="current_price"
                  name="current_price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  inputMode="decimal"
                  placeholder="899"
                  className="rounded-xl bg-background/60 pl-6"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target_price" className="text-sm">
                Target
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="target_price"
                  name="target_price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  inputMode="decimal"
                  placeholder="750"
                  className="rounded-xl bg-background/60 pl-6"
                />
              </div>
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-gear hover:bg-gear/90 text-white"
            >
              {pending ? "Saving…" : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
