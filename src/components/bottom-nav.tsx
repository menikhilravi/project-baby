"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNavItems, toolColors, type Phase } from "@/lib/nav";
import { useNavProgress } from "@/components/nav-progress";

export function BottomNav({
  phase,
  hiddenSections,
}: {
  phase: Phase;
  hiddenSections: readonly string[];
}) {
  const pathname = usePathname();
  const nav = useNavProgress();
  const pendingHref = nav?.pendingHref ?? null;
  const items = visibleNavItems(phase, hiddenSections);

  // Tailwind needs literal class strings; cover the realistic 4–6 item range.
  const colsClass =
    items.length >= 6
      ? "grid-cols-6"
      : items.length === 5
        ? "grid-cols-5"
        : items.length === 4
          ? "grid-cols-4"
          : "grid-cols-3";

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        viewTransitionName: "bottom-nav",
      }}
    >
      <ul className={cn("grid px-2 pt-1.5 pb-1", colsClass)}>
        {items.map((item) => {
          const Icon = item.icon;
          // While a tap is in flight, the highlight follows the pending route
          // so it moves instantly instead of waiting for the page to render.
          const active = pendingHref
            ? item.href === pendingHref
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const pending = pendingHref === item.href;
          const c = toolColors[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => nav?.start(item.href)}
                className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all active:scale-95"
              >
                <span
                  className={cn(
                    "grid place-items-center h-9 w-9 rounded-xl transition-all duration-200",
                    active ? cn(c.bgSoft, c.text) : "text-muted-foreground",
                    pending && "animate-pulse",
                  )}
                >
                  <Icon className="h-[19px] w-[19px]" />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none transition-colors",
                    active ? c.text : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
