"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NurseryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[nursery render error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="font-display text-lg font-semibold text-destructive">
          Nursery page crashed
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share the message below so we can fix the root cause.
        </p>
        <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-background p-3 text-[11px] leading-relaxed">
          {error.message || "(no message)"}
          {error.stack ? `\n\n${error.stack}` : ""}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <Button onClick={reset} className="mt-4" size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}
