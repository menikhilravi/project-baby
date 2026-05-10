"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BriefcaseMedical, Check } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { cn } from "@/lib/utils";

const lists = {
  mom: ["Robe & slippers", "Toiletries", "Phone charger", "Going-home outfit"],
  dad: ["Snacks & water", "Change of clothes", "Camera & charger", "Power bank"],
  baby: [
    "Going-home outfit",
    "Swaddle blanket",
    "Newborn diapers",
    "Pediatrician contact",
  ],
} as const;

type Owner = keyof typeof lists;

const ownerCopy: Record<Owner, { label: string; emoji: string }> = {
  mom: { label: "Mom", emoji: "🌷" },
  dad: { label: "Dad", emoji: "☕" },
  baby: { label: "Baby", emoji: "🧸" },
};

function ChecklistGroup({
  owner,
  state,
  onToggle,
}: {
  owner: Owner;
  state: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="space-y-2.5 mt-5">
      {lists[owner].map((item, i) => {
        const id = `${owner}-${i}`;
        const checked = !!state[id];
        return (
          <li key={id}>
            <label
              htmlFor={id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 cursor-pointer transition-all",
                "hover:border-hospital/40 hover:shadow-sm",
                checked && "bg-hospital-soft/60 border-hospital/30",
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => onToggle(id)}
                className={cn(
                  "data-[state=checked]:bg-hospital data-[state=checked]:border-hospital",
                  "data-[state=checked]:text-white",
                )}
              />
              <Label
                htmlFor={id}
                className={cn(
                  "text-sm font-normal cursor-pointer flex-1",
                  checked && "line-through text-muted-foreground",
                )}
              >
                {item}
              </Label>
              {checked ? (
                <Check className="h-4 w-4 text-hospital" />
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function HospitalPage() {
  const [state, setState] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setState((s) => ({ ...s, [id]: !s[id] }));

  const counts = (Object.keys(lists) as Owner[]).reduce(
    (acc, owner) => {
      const total = lists[owner].length;
      const done = lists[owner].filter((_, i) => state[`${owner}-${i}`]).length;
      acc[owner] = { done, total };
      return acc;
    },
    {} as Record<Owner, { done: number; total: number }>,
  );

  const totalDone = Object.values(counts).reduce((n, c) => n + c.done, 0);
  const totalAll = Object.values(counts).reduce((n, c) => n + c.total, 0);
  const overall = Math.round((totalDone / totalAll) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="hospital"
        icon={BriefcaseMedical}
        eyebrow="Go Bag"
        title="Pack with confidence."
        subtitle="A gentle nudge so nothing gets forgotten on the big day."
      />

      <div className="mb-6 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall progress</span>
          <span className="font-medium">
            {totalDone} / {totalAll} packed
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-hospital transition-all duration-500"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <Tabs defaultValue="mom">
        <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1.5 rounded-2xl h-auto">
          {(Object.keys(lists) as Owner[]).map((owner) => {
            const { done, total } = counts[owner];
            return (
              <TabsTrigger
                key={owner}
                value={owner}
                className={cn(
                  "rounded-xl py-2.5 flex flex-col gap-0.5 data-[state=active]:bg-card",
                  "data-[state=active]:shadow-sm transition-all",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span aria-hidden>{ownerCopy[owner].emoji}</span>
                  {ownerCopy[owner].label}
                </span>
                <span
                  className={cn(
                    "text-[10.5px] tabular-nums",
                    done === total && total > 0
                      ? "text-hospital"
                      : "text-muted-foreground",
                  )}
                >
                  {done}/{total}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(lists) as Owner[]).map((owner) => (
          <TabsContent key={owner} value={owner}>
            <ChecklistGroup owner={owner} state={state} onToggle={toggle} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
