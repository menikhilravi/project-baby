"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { KIND_META, type EventKind } from "@/lib/kind-meta";
import { Sheet } from "@/components/ui/sheet";
import { Pressable } from "@/components/ui/pressable";
import { useQuickLog } from "./use-quick-log";
import { FeedPicker } from "./feed-picker";
import { DiaperPicker } from "./diaper-picker";
import { MedPicker, PumpPicker, TempPicker, TummyPicker } from "./health-pickers";

export type QuickKind = Extract<EventKind, "feed" | "diaper" | "sleep" | "pump" | "temp" | "med" | "tummy">;

type Ctx = { open: (kind?: QuickKind) => void; isOpen: boolean };

const QuickLogContext = createContext<Ctx>({ open: () => {}, isOpen: false });

export function useQuickLogSheet() {
  return useContext(QuickLogContext);
}

const GRID: QuickKind[] = ["feed", "diaper", "sleep", "pump", "temp", "med", "tummy"];

const TITLES: Record<QuickKind, string> = {
  feed: "Feeding",
  diaper: "Diaper change",
  sleep: "Sleep",
  pump: "Pumping",
  temp: "Temperature",
  med: "Medicine",
  tummy: "Tummy time",
};

/** Mount once (in the layout). Any component can open it via useQuickLogSheet. */
export function QuickLogSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickKind | null>(null);
  const [dir, setDir] = useState(1);
  const { state, toggleSleep } = useQuickLog();
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  // A navigation (e.g. browser back) closes the sheet.
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    if (isOpen) setOpen(false);
  }

  const open = useCallback((k?: QuickKind) => {
    setKind(k ?? null);
    setDir(1);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const pick = (k: QuickKind, el: HTMLElement) => {
    if (k === "sleep") {
      void toggleSleep(el);
      close();
      return;
    }
    setDir(1);
    setKind(k);
  };

  return (
    <QuickLogContext.Provider value={{ open, isOpen }}>
      {children}
      <Sheet
        open={isOpen}
        onOpenChange={(o) => {
          setOpen(o);
        }}
        title={
          <span className="flex items-center gap-1">
            {kind ? (
              <button
                type="button"
                aria-label="Back to all"
                onClick={() => {
                  setDir(-1);
                  setKind(null);
                }}
                className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            {kind ? TITLES[kind] : "What happened?"}
          </span>
        }
        description={kind ? undefined : "Tap to log it — you can undo for a few seconds."}
      >
        <div className="relative overflow-hidden pb-2">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <m.div
              key={kind ?? "grid"}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring.gentle}
            >
              {kind === null ? (
                <div className="grid grid-cols-3 gap-3">
                  {GRID.map((k, i) => {
                    const meta = KIND_META[k];
                    const Icon = meta.icon;
                    const sleeping = k === "sleep" && Boolean(state.openSleep);
                    const nursing = k === "feed" && Boolean(state.openNursing);
                    return (
                      <Pressable
                        key={k}
                        onClick={(e) => pick(k, e.currentTarget)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-tile py-4 shadow-squish",
                          meta.tone.bgSoft,
                          i < 3 && "py-5",
                        )}
                      >
                        <span className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-card/70", meta.tone.strong)}>
                          <Icon className="h-6 w-6" />
                        </span>
                        <span className="text-sm font-bold">
                          {sleeping ? "Wake up" : nursing ? "Nursing…" : k === "tummy" ? "Tummy" : meta.label}
                        </span>
                      </Pressable>
                    );
                  })}
                </div>
              ) : kind === "feed" ? (
                <FeedPicker onDone={close} />
              ) : kind === "diaper" ? (
                <DiaperPicker onDone={close} />
              ) : kind === "temp" ? (
                <TempPicker onDone={close} />
              ) : kind === "med" ? (
                <MedPicker onDone={close} />
              ) : kind === "pump" ? (
                <PumpPicker onDone={close} />
              ) : kind === "tummy" ? (
                <TummyPicker onDone={close} />
              ) : null}
            </m.div>
          </AnimatePresence>
        </div>
      </Sheet>
    </QuickLogContext.Provider>
  );
}
