"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, animate, m, useMotionValue, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MilkBottle, BOTTLE_GEOMETRY } from "./milk-bottle";

type Unit = "oz" | "ml";

const CONFIG: Record<Unit, { max: number; step: number; start: number; labels: string[] }> = {
  oz: { max: 8, step: 0.5, start: 3, labels: ["2", "4", "6", "8"] },
  ml: { max: 240, step: 10, start: 90, labels: ["60", "120", "180", "240"] },
};

const UNIT_KEY = "bottle-unit";

function readUnit(): Unit {
  try {
    return localStorage.getItem(UNIT_KEY) === "ml" ? "ml" : "oz";
  } catch {
    return "oz";
  }
}

const spoken = (v: number, unit: Unit) =>
  unit === "oz" ? `${v} ${v === 1 ? "ounce" : "ounces"}` : `${v} millilitres`;

/**
 * Drag up and down on the bottle to fill it; it snaps to 0.5 oz / 10 ml with
 * a haptic tick. "Pour" tilts the bottle and drains it while the feed is
 * saved (the save starts immediately — the animation never delays it).
 */
export function BottlePicker({
  onLog,
}: {
  onLog: (amount: number, unit: Unit) => void;
}) {
  // Only ever rendered client-side (inside the sheet), so localStorage is safe here.
  const [unit, setUnit] = useState<Unit>(() => (typeof window === "undefined" ? "oz" : readUnit()));
  const [value, setValue] = useState(() => CONFIG[unit].start);
  const [pouring, setPouring] = useState(false);
  const reduced = useReducedMotion();
  const bottleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pourLevel = useMotionValue(0);
  const cfg = CONFIG[unit];

  const set = (v: number) => {
    const snapped = Math.round(Math.max(cfg.step, Math.min(cfg.max, v)) / cfg.step) * cfg.step;
    const clean = +snapped.toFixed(1);
    if (clean === value) return;
    haptic("tick");
    setValue(clean);
  };

  const fromPointer = (clientY: number) => {
    const el = bottleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = r.height / BOTTLE_GEOMETRY.VIEW_H;
    const bottom = r.top + BOTTLE_GEOMETRY.BODY_BOTTOM * scale;
    const top = r.top + BOTTLE_GEOMETRY.FILL_TOP * scale;
    const t = (bottom - clientY) / (bottom - top);
    set(t * cfg.max);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (pouring) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e.clientY);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(e.clientY);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = cfg.step * 2;
    const delta =
      e.key === "ArrowUp" || e.key === "ArrowRight"
        ? cfg.step
        : e.key === "ArrowDown" || e.key === "ArrowLeft"
          ? -cfg.step
          : e.key === "PageUp"
            ? big
            : e.key === "PageDown"
              ? -big
              : 0;
    if (e.key === "Home") return set(cfg.step);
    if (e.key === "End") return set(cfg.max);
    if (!delta) return;
    e.preventDefault();
    set(value + delta);
  };

  const changeUnit = (u: Unit) => {
    setUnit(u);
    setValue(CONFIG[u].start);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {}
  };

  const pour = () => {
    if (pouring) return;
    onLog(value, unit);
    if (reduced) return;
    setPouring(true);
    haptic("success");
    pourLevel.set(value / cfg.max);
    animate(pourLevel, 0, { duration: 0.9, ease: [0.4, 0, 0.6, 1], delay: 0.15 });
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <SegmentedControl
        label="Unit"
        size="sm"
        value={unit}
        onChange={changeUnit}
        options={[
          { value: "oz", label: "oz" },
          { value: "ml", label: "ml" },
        ]}
        className="w-36"
      />

      <div className="flex w-full items-center justify-center gap-5">
        <Button
          variant="soft"
          size="icon-lg"
          aria-label={`Less (${cfg.step} ${unit})`}
          onClick={() => set(value - cfg.step)}
          disabled={pouring}
        >
          <Minus />
        </Button>

        <div className="relative">
          <m.div
            ref={bottleRef}
            role="slider"
            tabIndex={0}
            aria-label="Bottle amount — drag up or down"
            aria-valuemin={cfg.step}
            aria-valuemax={cfg.max}
            aria-valuenow={value}
            aria-valuetext={spoken(value, unit)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            animate={pouring ? { rotate: -38, x: -18, y: 6 } : { rotate: 0, x: 0, y: 0 }}
            transition={spring.gentle}
            style={{ transformOrigin: "50% 85%" }}
            className="h-56 w-[124px] cursor-ns-resize touch-none select-none rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong"
          >
            <MilkBottle
              level={value / cfg.max}
              levelValue={pouring ? pourLevel : undefined}
              ticks={8}
              tickLabels={cfg.labels}
              className="h-full w-full"
            />
          </m.div>
          <AnimatePresence>{pouring ? <PourStream key="stream" /> : null}</AnimatePresence>
        </div>

        <Button
          variant="soft"
          size="icon-lg"
          aria-label={`More (${cfg.step} ${unit})`}
          onClick={() => set(value + cfg.step)}
          disabled={pouring}
        >
          <Plus />
        </Button>
      </div>

      <p className="font-display text-4xl font-semibold nums" aria-hidden>
        {value}
        <span className="ml-1 text-lg text-muted-foreground">{unit}</span>
      </p>

      <Button variant="squish" size="xl" className="w-full" onClick={pour} disabled={pouring}>
        {pouring ? "Logged!" : `Log ${value} ${unit} bottle`}
      </Button>
    </div>
  );
}

/** Milk droplets arcing out of the tilted nipple. */
function PourStream() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-1 top-10">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <m.span
          key={i}
          className={cn("absolute block rounded-full bg-milk ring-1 ring-foreground/10", i % 2 ? "h-2 w-2" : "h-2.5 w-2.5")}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: [-4, -26, -34], y: [0, 26, 70], opacity: [0, 1, 0] }}
          transition={{ duration: 0.7, delay: 0.25 + i * 0.09, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
