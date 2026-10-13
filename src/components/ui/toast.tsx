"use client";

import { useState, type ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";
import { AlertCircle, Check, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KIND_META } from "@/lib/kind-meta";
import { toastManager, type ToastData } from "@/lib/toast";
import { haptic } from "@/lib/haptics";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      {children}
      <Toaster />
    </Toast.Provider>
  );
}

/**
 * Stacked toasts pinned above the floating nav (mobile) or bottom-right
 * (desktop). Swipe down or sideways to dismiss. Anchored in view transitions
 * so route changes don't make them flicker.
 */
function Toaster() {
  const { toasts } = Toast.useToastManager<ToastData>();
  return (
    <Toast.Portal>
      <Toast.Viewport
        style={{ viewTransitionName: "toaster" }}
        className={cn(
          "fixed z-[80] left-1/2 -translate-x-1/2 w-[min(26rem,calc(100vw-2rem))]",
          "bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] md:bottom-6 md:left-auto md:right-6 md:translate-x-0",
        )}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function ToastCard({ toast }: { toast: Toast.Root.ToastObject<ToastData> }) {
  const [undoing, setUndoing] = useState(false);
  const kind = toast.data?.kind;
  const meta = kind ? KIND_META[kind] : null;
  const Icon = meta?.icon;
  const undo = toast.data?.undo;

  return (
    <Toast.Root
      toast={toast}
      swipeDirection={["down", "left", "right"]}
      className={cn(
        "absolute inset-x-0 bottom-0 mx-auto origin-bottom select-none",
        "flex items-center gap-3 rounded-[1.4rem] bg-popover/95 p-2.5 pr-2 text-popover-foreground shadow-pop ring-1 ring-border/60 backdrop-blur-xl",
        "[--gap:0.6rem] [--peek:0.55rem] [--scale:calc(max(0,1-(var(--toast-index)*0.06)))]",
        "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))))_scale(var(--scale))]",
        "transition-[transform,opacity] duration-[420ms] ease-squish",
        "data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-offset-y)-(var(--toast-index)*var(--gap))))]",
        "data-[starting-style]:[transform:translateY(130%)_scale(0.9)] data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0 data-[ending-style]:duration-200 data-[ending-style]:ease-out",
        "data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+120%))]",
        "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-120%))]",
        "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+120%))]",
        "data-[limited]:opacity-0 data-[swiping]:duration-0",
        "after:absolute after:inset-x-0 after:top-full after:h-[calc(var(--gap)+1px)] after:content-['']",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
          meta ? cn(meta.tone.bgSoft, meta.tone.strong) : toast.type === "error" ? "bg-destructive/15 text-destructive" : "bg-accent-baby-soft text-accent-baby-strong",
        )}
      >
        {Icon ? (
          <Icon className="h-5 w-5" />
        ) : toast.type === "error" ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <Check className="h-5 w-5" strokeWidth={2.6} />
        )}
      </span>
      <Toast.Content className="min-w-0 flex-1">
        <Toast.Title className="truncate text-sm font-bold" />
        <Toast.Description className="truncate text-xs text-muted-foreground" />
      </Toast.Content>
      {undo ? (
        <button
          type="button"
          disabled={undoing}
          onClick={async () => {
            haptic("tap");
            setUndoing(true);
            try {
              await undo();
              toastManager.close(toast.id);
            } catch {
              setUndoing(false);
            }
          }}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-accent-baby-soft px-3.5 text-sm font-bold text-accent-baby-strong transition-transform active:scale-95 disabled:opacity-60"
        >
          <Undo2 className="h-4 w-4" />
          {undoing ? "Undoing…" : "Undo"}
        </button>
      ) : (
        <Toast.Close
          aria-label="Dismiss"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Toast.Close>
      )}
    </Toast.Root>
  );
}
