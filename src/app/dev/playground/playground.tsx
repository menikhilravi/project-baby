"use client";

import { useState } from "react";
import { BabyMascot, type MascotMood } from "@/components/mascot/baby-mascot";
import { EmptyState } from "@/components/mascot/empty-state";
import { MilkBottle } from "@/components/milk/milk-bottle";
import { BottlePicker } from "@/components/milk/bottle-picker";
import { IntakeGauge } from "@/components/milk/intake-gauge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useCelebrate } from "@/components/celebrate/celebrate-provider";
import { toast } from "@/lib/toast";
import { TodayHero } from "@/app/today/_components/today-hero";
import { SinceRings } from "@/app/today/_components/since-rings";
import { QuickLogGrid } from "@/app/today/_components/quick-log-grid";
import { SleepTimer } from "@/components/quick-log/sleep-timer";
import { NursingTimer } from "@/components/quick-log/nursing-timer";
import { DiaperPicker } from "@/components/quick-log/diaper-picker";
import { EMPTY_SNAPSHOT, type LiveSnapshot } from "@/lib/live-state";
import { GrowthCard } from "@/app/reports/_components/growth-card";
import { MilestonesCard } from "@/app/reports/_components/milestones-card";
import { AddMeasurementSheet } from "@/app/reports/_components/add-measurement-sheet";
import type { GrowthRow } from "@/app/reports/_components/growth-shared";

const GROWTH: GrowthRow[] = [
  { id: 1, measured_on: "2026-07-01", weight_g: 3350, height_cm: 50, head_cm: 34.5 },
  { id: 2, measured_on: "2026-07-15", weight_g: 3500, height_cm: 51.5, head_cm: 35.2 },
  { id: 3, measured_on: "2026-08-05", weight_g: 4400, height_cm: 54, head_cm: 37 },
  { id: 4, measured_on: "2026-09-02", weight_g: 5300, height_cm: 57.5, head_cm: 38.6 },
  { id: 5, measured_on: "2026-10-05", weight_g: 6100, height_cm: 60.5, head_cm: 40 },
];
import type { Accent } from "@/lib/theme";
import { AppHeader } from "@/components/app-shell/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { QuickLogSheetProvider } from "@/components/quick-log/quick-log-sheet";

const MOODS: MascotMood[] = ["idle", "happy", "sleeping", "feeding", "hungry", "celebrate", "peek"];

const minsAgo = (now: number, min: number) => new Date(now - min * 60_000).toISOString();

export function Playground() {
  const [accent, setAccent] = useState<Accent>("neutral");
  const { previewAccent } = useTheme();
  const celebrate = useCelebrate();
  const [sheet, setSheet] = useState(false);
  const [level, setLevel] = useState(0.5);
  const [ruler, setRuler] = useState(false);
  const [now] = useState(() => Date.now());
  const state: LiveSnapshot = {
    ...EMPTY_SNAPSHOT,
    lastFeedAt: minsAgo(now, 95),
    lastDiaperAt: minsAgo(now, 200),
    lastWakeAt: minsAgo(now, 40),
    lastBreastSide: "left",
    serverNow: now,
  };

  return (
    <QuickLogSheetProvider>
    <AppHeader email="parent@example.com" />
    <BottomNav phase="postnatal" hiddenSections={[]} />
    <div className="mx-auto max-w-2xl space-y-8 px-4 pt-20 pb-32">
      <div className="space-y-3">
        <ThemeToggle size="md" />
        <SegmentedControl
          label="Accent"
          value={accent}
          onChange={(a) => {
            setAccent(a);
            previewAccent(a);
          }}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "boy", label: "Boy" },
            { value: "girl", label: "Girl" },
          ]}
        />
      </div>

      <section id="mascots" className="grid grid-cols-4 gap-4 rounded-card bg-card p-4 shadow-soft">
        {MOODS.map((m) => (
          <div key={m} className="flex flex-col items-center gap-1">
            <BabyMascot mood={m} size={80} variant={accent} />
            <span className="text-xs font-bold text-muted-foreground">{m}</span>
          </div>
        ))}
      </section>

      <section id="today" className="space-y-4">
        <TodayHero now={now} mood="idle" />
        <SinceRings state={state} counts={{ feeds: 6, diapers: 4, bottleOz: 9 }} now={now} feedIntervalMin={150} wakeWindowMin={60} />
        <QuickLogGrid state={state} counts={{ feeds: 6, diapers: 4, bottleOz: 9 }} now={now} intakeHigh={20} />
        <IntakeGauge oz={9} range={{ low: 16, high: 20 }} />
      </section>

      <section id="sessions" className="space-y-4">
        <NursingTimer side="left" startedAt={minsAgo(now, 7)} />
        <SleepTimer startedAt={minsAgo(now, 83)} />
        <TodayHero now={now} mood="sleeping" />
      </section>

      <section id="milk" className="flex items-end gap-6 rounded-card bg-card p-4 shadow-soft">
        <MilkBottle level={level} ticks={8} tickLabels={["2", "4", "6", "8"]} className="h-48 w-28" />
        <div className="flex-1 space-y-2">
          <Button onClick={() => setLevel((l) => (l > 0.6 ? 0.15 : 0.9))}>Slosh</Button>
        </div>
      </section>

      <section id="bottle" className="rounded-card bg-popover p-5 shadow-pop">
        <BottlePicker onLog={(a, u) => toast.log(`Bottle · ${a} ${u}`, { kind: "feed", undo: () => {} })} />
      </section>

      <section id="diaper" className="rounded-card bg-popover p-5 shadow-pop">
        <DiaperPicker />
      </section>

      <section id="actions" className="flex flex-wrap gap-3">
        <Button variant="squish" size="lg" onClick={(e) => celebrate("log", { origin: e.currentTarget, word: "Yum!" })}>
          Celebrate log
        </Button>
        <Button variant="soft" size="lg" onClick={() => celebrate("milestone", { word: "First smile!" })}>
          Milestone
        </Button>
        <Button variant="soft" size="lg" onClick={() => celebrate("growth", { word: "Growing!" })}>
          Growth
        </Button>
        <Button variant="outline" size="lg" onClick={() => toast.log("Wet diaper", { kind: "diaper", undo: () => {} })}>
          Toast
        </Button>
        <Button variant="outline" size="lg" onClick={() => setSheet(true)}>
          Sheet
        </Button>
      </section>

      <section id="growth" className="space-y-4">
        <GrowthCard measurements={GROWTH} birthDate="2026-07-01" initialSex={null} />
        <MilestonesCard
          milestones={[
            { id: 1, notes: "First smile", occurred_at: "2026-08-10T12:00:00Z" },
            { id: 2, notes: "Held head up", occurred_at: "2026-09-12T12:00:00Z" },
          ]}
        />
      </section>

      <section id="ruler" className="rounded-card bg-popover p-5 shadow-pop">
        <Button onClick={() => setRuler(true)}>Ruler sheet</Button>
        <AddMeasurementSheet open={ruler} onOpenChange={setRuler} measurements={GROWTH} birthDate="2026-07-01" sex="female" />
      </section>

      <EmptyState title="No feeds yet today" body="Tap Feed when baby eats and it'll show up here." />

      <Sheet open={sheet} onOpenChange={setSheet} title="What happened?" description="A sample sheet.">
        <DiaperPicker onDone={() => setSheet(false)} />
      </Sheet>
    </div>
    </QuickLogSheetProvider>
  );
}
