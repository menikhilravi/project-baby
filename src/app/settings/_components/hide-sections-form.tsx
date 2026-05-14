"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { navItems, HIDEABLE_KEYS, type ToolKey } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { updateHiddenSections } from "../actions";

export function HideSectionsForm({
  initialHidden,
}: {
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choices = navItems.filter((it) =>
    (HIDEABLE_KEYS as ToolKey[]).includes(it.key),
  );

  const toggle = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateHiddenSections(Array.from(next));
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
        // revert on error
        setHidden(hidden);
      }
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-1.5">
      {choices.map((item) => {
        const isHidden = hidden.has(item.key);
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left",
              "hover:bg-muted/40",
              isHidden && "opacity-50",
            )}
          >
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-muted/60 shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {item.tagline}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 grid place-items-center h-7 w-7 rounded-lg transition-colors",
                isHidden
                  ? "text-muted-foreground"
                  : "text-foreground bg-muted/60",
              )}
              aria-label={isHidden ? "Hidden" : "Visible"}
            >
              {isHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </span>
          </button>
        );
      })}
      <p
        className={cn(
          "px-3 pt-1.5 text-[11px] tabular-nums",
          error
            ? "text-destructive"
            : pending
              ? "text-muted-foreground"
              : savedAt
                ? "text-foreground/60"
                : "text-muted-foreground/60",
        )}
      >
        {error ? error : pending ? "Saving…" : savedAt ? "Saved" : ""}
      </p>
    </div>
  );
}
