"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function RewardsPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="rewards"
        icon={CreditCard}
        eyebrow="Findummy Opt"
        title="Maximize every swipe."
        subtitle="Tell us where you’re spending — we’ll tell you which card earns the most."
      />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">
            Store or category
          </Label>
          <Input
            id="category"
            placeholder="e.g. Amazon, groceries, dining"
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
              type="number"
              inputMode="decimal"
              placeholder="0"
              className="h-11 rounded-xl bg-background/60 pl-7"
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-rewards hover:bg-rewards/90 text-white shadow-sm hover:shadow transition-all"
        >
          Find best card
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </form>

      <Card className="mt-6 overflow-hidden border-rewards/30 bg-gradient-to-br from-rewards-soft via-card to-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-rewards">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-[0.18em] font-medium">
              Recommended
            </span>
          </div>

          <div className="mt-3 flex items-start gap-4">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-rewards/10 text-rewards shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold leading-tight">
                Chase Sapphire Preferred
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Earns <span className="font-medium text-foreground">3× points</span>{" "}
                on dining and online groceries.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-background/60 border p-3">
              <p className="font-display text-xl font-semibold tabular-nums">
                1,250
              </p>
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                points
              </p>
            </div>
            <div className="rounded-xl bg-background/60 border p-3">
              <p className="font-display text-xl font-semibold tabular-nums">
                $15.63
              </p>
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                est. value
              </p>
            </div>
            <div className="rounded-xl bg-background/60 border p-3">
              <p className="font-display text-xl font-semibold tabular-nums">
                3.0×
              </p>
              <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-0.5">
                multiplier
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Mocked recommendation — real card logic coming next.
      </p>
    </div>
  );
}
