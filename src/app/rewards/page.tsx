"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { findBestCard, type FindBestCardResult } from "./actions";

const fmtNumber = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export default function RewardsPage() {
  const [result, action, pending] = useActionState<
    FindBestCardResult | null,
    FormData
  >(findBestCard, null);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="rewards"
        icon={CreditCard}
        eyebrow="Findummy Opt"
        title="Maximize every swipe."
        subtitle="Tell us where you're spending — we'll tell you which card earns the most."
      />

      <form
        action={action}
        className="space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">
            Store or category
          </Label>
          <Input
            id="category"
            name="category"
            required
            placeholder="e.g. Whole Foods, Uber Eats, Amazon"
            className="h-11 rounded-xl bg-background/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spend" className="text-sm font-medium">
            Expected spend
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              id="spend"
              name="spend"
              type="number"
              step="0.01"
              min="0.01"
              required
              inputMode="decimal"
              placeholder="0"
              className="h-11 rounded-xl bg-background/60 pl-7"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-xl bg-rewards hover:bg-rewards/90 text-white shadow-sm hover:shadow transition-all"
        >
          {pending ? "Looking up cards…" : "Find best card"}
          {!pending ? <ArrowRight className="h-4 w-4 ml-1" /> : null}
        </Button>
      </form>

      {result && !result.ok ? (
        <div className="mt-6 rounded-3xl border bg-card/60 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rewards mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Hmm.</p>
            <p className="text-muted-foreground mt-0.5">{result.message}</p>
          </div>
        </div>
      ) : null}

      {result && result.ok ? (
        <Card className="mt-6 overflow-hidden border-rewards/30 bg-gradient-to-br from-rewards-soft via-card to-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-rewards">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-[0.18em] font-medium">
                Recommended for {result.category.replace("_", " ")}
              </span>
            </div>

            <div className="mt-3 flex items-start gap-4">
              <div className="grid place-items-center h-12 w-12 rounded-2xl bg-rewards/10 text-rewards shrink-0">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl font-semibold leading-tight">
                  {result.best.cardName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Earns{" "}
                  <span className="font-medium text-foreground">
                    {result.best.multiplier}× points
                  </span>{" "}
                  on {result.category.replace("_", " ")}.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-background/60 border p-3">
                <p className="font-display text-xl font-semibold tabular-nums">
                  {fmtNumber(result.best.points)}
                </p>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  points
                </p>
              </div>
              <div className="rounded-xl bg-background/60 border p-3">
                <p className="font-display text-xl font-semibold tabular-nums">
                  {fmtMoney(result.best.dollarValue)}
                </p>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  est. value
                </p>
              </div>
              <div className="rounded-xl bg-background/60 border p-3">
                <p className="font-display text-xl font-semibold tabular-nums">
                  {result.best.multiplier.toFixed(1)}×
                </p>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  multiplier
                </p>
              </div>
            </div>

            {result.runnersUp.length > 0 ? (
              <details className="mt-5 group">
                <summary className="text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">
                    ›
                  </span>
                  Other cards on {result.category.replace("_", " ")}
                </summary>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {result.runnersUp.map((m) => (
                    <li
                      key={m.cardId}
                      className="flex items-center justify-between rounded-lg bg-background/40 border px-3 py-2"
                    >
                      <span className="truncate">{m.cardName}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-3">
                        {m.multiplier}× · {fmtNumber(m.points)} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Card data is hand-curated. Real benefits vary by issuer terms.
      </p>
    </div>
  );
}
