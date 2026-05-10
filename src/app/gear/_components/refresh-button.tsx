"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { refreshUserPrices } from "../actions";

export function RefreshButton({ lastCheckedAt }: { lastCheckedAt: string | null }) {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  const subtitle = summary ?? formatRelative(lastCheckedAt);

  return (
    <div className="flex items-center gap-2">
      {subtitle ? (
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setSummary(null);
          startTransition(async () => {
            try {
              const result = await refreshUserPrices();
              setSummary(
                result.failed > 0
                  ? `Refreshed: ${result.ok} ok, ${result.failed} failed`
                  : `Refreshed ${result.ok} watcher${result.ok === 1 ? "" : "s"}`,
              );
            } catch (e) {
              setSummary(e instanceof Error ? e.message : "Refresh failed");
            }
          });
        }}
        className="rounded-full"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
        {pending ? "Refreshing…" : "Refresh prices"}
      </Button>
    </div>
  );
}

function formatRelative(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "Updated just now";
  if (min < 60) return `Updated ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Updated ${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `Updated ${d}d ago`;
}
