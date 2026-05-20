"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  AlertTriangle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  removeWatcher,
  setWatcherPriceManual,
  addWatcher,
  setChosenWatcher,
  reorderWatcher,
} from "../actions";

export type WatcherRow = {
  id: string;
  retailer: string;
  url: string;
  current_price: number | null;
  last_checked_at: string | null;
  last_checked_status: "pending" | "ok" | "failed";
  last_error: string | null;
  is_chosen: boolean;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function relative(iso: string | null) {
  if (!iso) return "never";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function WatchersList({
  itemId,
  watchers,
  bestPrice,
  embedded = false,
  optionLabel = "retailer",
}: {
  itemId: string;
  watchers: WatcherRow[];
  bestPrice: number | null;
  /** When true, skip the collapsible header and always render the list. */
  embedded?: boolean;
  /** Singular noun used in the header ("retailer", "option", etc.). */
  optionLabel?: string;
}) {
  const [open, setOpen] = useState(embedded);

  const list = (
    <ul className={cn(embedded ? "space-y-1.5" : "mt-3 space-y-1.5")}>
      {watchers.map((w, i) => (
        <WatcherRowView
          key={w.id}
          watcher={w}
          isBest={
            bestPrice !== null &&
            w.current_price !== null &&
            Number(w.current_price) === Number(bestPrice)
          }
          isFirst={i === 0}
          isLast={i === watchers.length - 1}
        />
      ))}
      <li>
        <AddWatcherForm itemId={itemId} optionLabel={optionLabel} />
      </li>
    </ul>
  );

  if (embedded) return list;

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          {watchers.length}{" "}
          {watchers.length === 1 ? optionLabel : `${optionLabel}s`}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? list : null}
    </div>
  );
}

function WatcherRowView({
  watcher,
  isBest,
  isFirst,
  isLast,
}: {
  watcher: WatcherRow;
  isBest: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    watcher.current_price !== null ? String(watcher.current_price) : "",
  );
  const [, startTransition] = useTransition();
  const failed = watcher.last_checked_status === "failed";
  const chosen = watcher.is_chosen;

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-background/40 px-3 py-2 text-sm",
        isBest && "border-hospital/30 bg-hospital-soft/30",
        chosen && "border-gear/50 bg-gear-soft/40 ring-1 ring-gear/30",
        failed && !editing && "border-names/30 bg-names-soft/20",
      )}
    >
      <div className="flex flex-col -my-1">
        <form action={reorderWatcher}>
          <input type="hidden" name="id" value={watcher.id} />
          <input type="hidden" name="direction" value="up" />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={isFirst}
            className="h-5 w-5 rounded text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        </form>
        <form action={reorderWatcher}>
          <input type="hidden" name="id" value={watcher.id} />
          <input type="hidden" name="direction" value="down" />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={isLast}
            className="h-5 w-5 rounded text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </form>
      </div>

      <form action={setChosenWatcher}>
        <input type="hidden" name="id" value={watcher.id} />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className={cn(
            "h-7 w-7 rounded-md shrink-0",
            chosen
              ? "text-gear hover:text-gear/80"
              : "text-muted-foreground/60 hover:text-gear",
          )}
          aria-label={chosen ? "Unchoose this option" : "Choose this option"}
          aria-pressed={chosen}
        >
          <Star
            className={cn("h-3.5 w-3.5", chosen && "fill-current")}
          />
        </Button>
      </form>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{watcher.retailer}</span>
          {chosen ? (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gear text-white font-semibold">
              chosen
            </span>
          ) : null}
          {isBest ? (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-hospital text-white font-semibold">
              best
            </span>
          ) : null}
          <a
            href={watcher.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open product"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          checked {relative(watcher.last_checked_at)}
          {failed && watcher.last_error ? (
            <span className="ml-1 inline-flex items-center gap-0.5 text-names">
              <AlertTriangle className="h-3 w-3" />
              {watcher.last_error.length > 40
                ? watcher.last_error.slice(0, 40) + "…"
                : watcher.last_error}
            </span>
          ) : null}
        </p>
      </div>

      {editing ? (
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await setWatcherPriceManual(fd);
                setEditing(false);
              } catch (e) {
                console.error(e);
              }
            })
          }
          className="flex items-center gap-1"
        >
          <input type="hidden" name="id" value={watcher.id} />
          <span className="text-xs text-muted-foreground">$</span>
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-7 w-20 rounded-md text-sm tabular-nums px-2"
          />
          <Button
            type="submit"
            size="icon"
            className="h-7 w-7 rounded-md bg-gear text-white hover:bg-gear/90"
            aria-label="Save"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="h-7 w-7 rounded-md"
            aria-label="Cancel"
          >
            <X className="h-3 w-3" />
          </Button>
        </form>
      ) : (
        <>
          <span className="font-medium tabular-nums shrink-0">
            {watcher.current_price !== null
              ? fmt(Number(watcher.current_price))
              : "—"}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Set price manually"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <form action={removeWatcher}>
            <input type="hidden" name="id" value={watcher.id} />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </form>
        </>
      )}
    </li>
  );
}

function AddWatcherForm({
  itemId,
  optionLabel,
}: {
  itemId: string;
  optionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/60 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-gear/40 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add another {optionLabel}
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          try {
            await addWatcher(fd);
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="flex items-center gap-2 rounded-xl border bg-background/40 px-2 py-1.5"
    >
      <input type="hidden" name="item_id" value={itemId} />
      <Input
        name="url"
        type="url"
        required
        autoFocus
        placeholder="https://…"
        className="flex-1 h-7 border-0 shadow-none focus-visible:ring-0 px-2 text-sm bg-transparent"
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="h-7 rounded-md bg-gear hover:bg-gear/90 text-white"
      >
        {pending ? "…" : "Add"}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setOpen(false)}
        className="h-7 w-7 rounded-md"
        aria-label="Cancel"
      >
        <X className="h-3 w-3" />
      </Button>
      {error ? <span className="text-[11px] text-destructive ml-2">{error}</span> : null}
    </form>
  );
}
