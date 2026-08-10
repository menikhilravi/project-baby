"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The two dates the whole report hangs off. Both live in the URL so a range
 * survives a refresh and can be re-opened from a bookmark — and so the server
 * can fetch exactly the events the window needs.
 */
export function VisitRangePicker({
  from,
  to,
  days,
  hint,
}: {
  from: string;
  to: string;
  days: number;
  hint: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const setRange = (next: { from?: string; to?: string }) => {
    const params = new URLSearchParams({
      from: next.from ?? from,
      to: next.to ?? to,
    });
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false });
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 print:hidden">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[9rem] flex-1">
          <Label htmlFor="visit-from" className="mb-1.5 text-xs">
            Last visit
          </Label>
          <Input
            id="visit-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setRange({ from: e.target.value })}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <Label htmlFor="visit-to" className="mb-1.5 text-xs">
            Next visit
          </Label>
          <Input
            id="visit-to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setRange({ to: e.target.value })}
          />
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.print()}
          className="shrink-0"
        >
          <Printer /> Print
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {days} {days === 1 ? "day" : "days"} of data
        {hint ? ` · dates from your last "${hint}"` : ""}
        {pending ? " · updating…" : ""}
      </p>
    </div>
  );
}
