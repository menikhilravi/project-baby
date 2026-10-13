"use client";

import { useCallback } from "react";
import { useBabyLive } from "@/components/live/baby-live-provider";
import { useCelebrate, type CelebrateOptions } from "@/components/celebrate/celebrate-provider";
import { toast } from "@/lib/toast";
import { KIND_META } from "@/lib/kind-meta";
import { MED_LABELS, type DiaperSubtype, type MedSubtype } from "@/lib/baby-events";
import { formatSpan } from "@/lib/time-format";
import type { LiveEvent } from "@/lib/live-state";
import {
  logEvent,
  logMed,
  logPump,
  logTemp,
  logTummy,
  removeEvent,
  startNursing as startNursingAction,
  stopNursing as stopNursingAction,
  toggleSleep as toggleSleepAction,
  updateEvent,
} from "@/app/log/actions";

type Origin = CelebrateOptions["origin"];

const tempId = () => -Math.floor(Math.random() * 1e9) - 1;
const nowIso = () => new Date().toISOString();

function fail(err: unknown) {
  toast.error("Couldn't save that", err instanceof Error ? err.message : "Check your connection and try again.");
}

const DIAPER_LABEL: Record<DiaperSubtype, string> = {
  pee: "Wet diaper",
  poop: "Dirty diaper",
  both: "Wet + dirty diaper",
};

/**
 * Every quick log goes through here: optimistic update → celebration →
 * server action → toast with Undo. Errors roll back and say so.
 */
export function useQuickLog() {
  const { state, run, apply } = useBabyLive();
  const celebrate = useCelebrate();

  const removeUndo = useCallback(
    (id: number) => async () => {
      await removeEvent(id);
      apply({ type: "remove", id });
    },
    [apply],
  );

  const logFeed = useCallback(
    async (
      detail: { subtype?: "bottle" | "solid"; amount?: number; unit?: "oz" | "ml" },
      origin?: Origin,
    ) => {
      const at = nowIso();
      const event: LiveEvent = {
        id: tempId(),
        kind: "feed",
        subtype: detail.subtype ?? null,
        amount: detail.amount ?? null,
        unit: detail.unit ?? null,
        occurred_at: at,
        ended_at: at,
      };
      celebrate("log", { origin, word: "Yum!", mood: "happy", color: KIND_META.feed.cssVar });
      try {
        const res = await run(() => logEvent("feed", detail), {
          optimistic: { type: "insert", event },
          confirm: (r) => [{ type: "insert", event: { ...event, id: r.id } }],
        });
        const title =
          detail.subtype === "bottle" && detail.amount != null
            ? `Bottle · ${detail.amount} ${detail.unit ?? "oz"}`
            : detail.subtype === "solid"
              ? "Solids logged"
              : "Feed logged";
        toast.log(title, { kind: "feed", undo: removeUndo(res.id) });
        return res;
      } catch (err) {
        fail(err);
      }
    },
    [celebrate, run, removeUndo],
  );

  const logDiaper = useCallback(
    async (subtype: DiaperSubtype | null, origin?: Origin) => {
      const at = nowIso();
      const event: LiveEvent = {
        id: tempId(),
        kind: "diaper",
        subtype,
        amount: null,
        unit: null,
        occurred_at: at,
        ended_at: null,
      };
      celebrate("log", { origin, word: "Fresh!", mood: "happy", color: KIND_META.diaper.cssVar });
      try {
        const res = await run(() => logEvent("diaper", subtype ? { subtype } : undefined), {
          optimistic: { type: "insert", event },
          confirm: (r) => [{ type: "insert", event: { ...event, id: r.id } }],
        });
        toast.log(subtype ? DIAPER_LABEL[subtype] : "Diaper logged", {
          kind: "diaper",
          undo: removeUndo(res.id),
        });
      } catch (err) {
        fail(err);
      }
    },
    [celebrate, run, removeUndo],
  );

  const startNursing = useCallback(
    async (side: "left" | "right", origin?: Origin) => {
      const prev = state.openNursing;
      const at = nowIso();
      celebrate("log", { origin, word: prev ? "Other side!" : "Nom nom", mood: "feeding", color: KIND_META.feed.cssVar });
      try {
        const res = await run(() => startNursingAction(side), {
          optimistic: { type: "startNursing", id: tempId(), side, at },
          confirm: (r) => [{ type: "startNursing", id: r.id, side, at }],
        });
        toast.log(prev ? `Switched to ${side}` : `Nursing · ${side} side`, {
          kind: "feed",
          undo: async () => {
            await removeEvent(res.id);
            apply({ type: "remove", id: res.id });
            if (res.closedId && prev) {
              await updateEvent(res.closedId, { ended_at: null });
              apply({ type: "reopenNursing", id: res.closedId, side: prev.side, occurred_at: prev.occurred_at });
            }
          },
        });
      } catch (err) {
        fail(err);
      }
    },
    [state.openNursing, celebrate, run, apply],
  );

  const stopNursing = useCallback(async () => {
    const prev = state.openNursing;
    if (!prev) return;
    const at = nowIso();
    try {
      const res = await run(() => stopNursingAction(), {
        optimistic: { type: "stopNursing", at },
        confirm: () => [{ type: "stopNursing", at }],
      });
      const span = formatSpan(Date.now() - new Date(prev.occurred_at).getTime());
      toast.log(`Nursed ${span} on the ${prev.side}`, {
        kind: "feed",
        undo: res
          ? async () => {
              await updateEvent(res.id, { ended_at: null });
              apply({ type: "reopenNursing", id: res.id, side: prev.side, occurred_at: prev.occurred_at });
            }
          : undefined,
      });
    } catch (err) {
      fail(err);
    }
  }, [state.openNursing, run, apply]);

  const toggleSleep = useCallback(
    async (origin?: Origin) => {
      const prev = state.openSleep;
      const at = nowIso();
      if (prev) {
        celebrate("log", { origin, word: "Good morning!", mood: "happy", color: KIND_META.sleep.cssVar });
      } else {
        celebrate("log", { origin, word: "Night night", mood: "sleeping", color: KIND_META.sleep.cssVar });
      }
      try {
        const res = await run(() => toggleSleepAction(), {
          optimistic: prev ? { type: "stopSleep", at } : { type: "startSleep", id: tempId(), at },
          confirm: (r) =>
            r.action === "stopped" ? [{ type: "stopSleep", at }] : [{ type: "startSleep", id: r.id, at }],
        });
        if (res.action === "started") {
          toast.log("Sleep started", { kind: "sleep", undo: removeUndo(res.id) });
        } else {
          const span = prev ? formatSpan(Date.now() - new Date(prev.occurred_at).getTime()) : "";
          toast.log(span ? `Slept ${span}` : "Awake", {
            kind: "sleep",
            undo: prev
              ? async () => {
                  await updateEvent(res.id, { ended_at: null });
                  apply({ type: "reopenSleep", id: res.id, occurred_at: prev.occurred_at });
                }
              : undefined,
          });
        }
      } catch (err) {
        fail(err);
      }
    },
    [state.openSleep, celebrate, run, apply, removeUndo],
  );

  const logTemperature = useCallback(
    async (amount: number, unit: "f" | "c", origin?: Origin) => {
      celebrate("log", { origin, word: "Noted", mood: "idle", color: KIND_META.temp.cssVar });
      try {
        const res = await run(() => logTemp(amount, unit));
        toast.log(`${amount.toFixed(1)}°${unit.toUpperCase()} logged`, { kind: "temp", undo: removeUndo(res.id) });
      } catch (err) {
        fail(err);
      }
    },
    [celebrate, run, removeUndo],
  );

  const logMedicine = useCallback(
    async (subtype: MedSubtype, origin?: Origin) => {
      celebrate("log", { origin, word: "Done!", mood: "happy", color: KIND_META.med.cssVar });
      try {
        const res = await run(() =>
          logMed(subtype === "vitamin_d" ? { subtype, amount: 400, unit: "iu" } : { subtype }),
        );
        toast.log(`${MED_LABELS[subtype]} given`, { kind: "med", undo: removeUndo(res.id) });
      } catch (err) {
        fail(err);
      }
    },
    [celebrate, run, removeUndo],
  );

  const logPumping = useCallback(
    async (amount: number, unit: "oz" | "ml", side: "left" | "right" | "both", origin?: Origin) => {
      celebrate("log", { origin, word: "Liquid gold!", mood: "happy", color: KIND_META.pump.cssVar });
      try {
        const res = await run(() => logPump(amount, unit, side));
        toast.log(`Pumped ${amount} ${unit}`, { kind: "pump", undo: removeUndo(res.id) });
      } catch (err) {
        fail(err);
      }
    },
    [celebrate, run, removeUndo],
  );

  const logTummyTime = useCallback(
    async (minutes: number, origin?: Origin) => {
      celebrate("log", { origin, word: "So strong!", mood: "happy", color: KIND_META.tummy.cssVar });
      try {
        const res = await run(() => logTummy(minutes));
        toast.log(`${minutes} min tummy time`, { kind: "tummy", undo: removeUndo(res.id) });
      } catch (err) {
        fail(err);
      }
    },
    [celebrate, run, removeUndo],
  );

  return {
    state,
    logFeed,
    logDiaper,
    startNursing,
    stopNursing,
    toggleSleep,
    logTemperature,
    logMedicine,
    logPumping,
    logTummyTime,
  };
}
