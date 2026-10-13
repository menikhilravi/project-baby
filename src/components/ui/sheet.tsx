"use client";

import type { ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on Base UI Drawer: swipe down to dismiss, focus trapped, page
 * scroll locked. On md+ it floats as a centred card. Enter/exit use the
 * squish spring curve; the drag follows the finger with no transition.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  children,
  className,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Keep the title for screen readers but don't draw it. */
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
  trigger?: React.ReactElement;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => onOpenChange?.(o)}>
      {trigger ? <Drawer.Trigger render={trigger} /> : null}
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            "fixed inset-0 z-[70] bg-(--scrim) backdrop-blur-[2px]",
            "opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-300",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[swiping]:duration-0",
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-[71] flex items-end justify-center md:items-center pointer-events-none">
          <Drawer.Popup
            className={cn(
              "pointer-events-auto relative flex w-full max-h-[90dvh] flex-col outline-none",
              "rounded-t-[2rem] md:rounded-[2rem] md:max-w-lg md:mb-0",
              "bg-popover text-popover-foreground shadow-pop ring-1 ring-border/60",
              "pb-[max(env(safe-area-inset-bottom),1rem)]",
              "translate-y-(--drawer-swipe-movement-y) transition-transform duration-[450ms] ease-squish",
              "data-[swiping]:duration-0 data-[swiping]:select-none",
              "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
              "data-[ending-style]:duration-[calc(300ms*var(--drawer-swipe-strength,1))] data-[ending-style]:ease-out-soft",
              "md:data-[starting-style]:translate-y-8 md:data-[starting-style]:opacity-0 md:data-[ending-style]:translate-y-8 md:data-[ending-style]:opacity-0 md:transition-[transform,opacity]",
              className,
            )}
          >
            <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1.5 w-11 shrink-0 rounded-full bg-foreground/15 md:hidden" />
            <div className={cn("flex items-start gap-3 px-6 pt-3", hideTitle && "sr-only")}>
              <div className="min-w-0 flex-1">
                <Drawer.Title className="font-display text-xl font-semibold leading-tight">
                  {title}
                </Drawer.Title>
                {description ? (
                  <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </Drawer.Description>
                ) : null}
              </div>
              <Drawer.Close
                aria-label="Close"
                className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-2">
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
