"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItemsForPhase, toolColors, type Phase } from "@/lib/nav";

export function BottomNav({ phase }: { phase: Phase }) {
  const pathname = usePathname();
  const items = navItemsForPhase(phase);

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
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border/40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
    >
      <ul className={cn("grid px-2 pt-1.5 pb-1", colsClass)}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const c = toolColors[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all active:scale-95"
              >
                <span
                  className={cn(
                    "grid place-items-center h-9 w-9 rounded-xl transition-all",
                    active ? cn(c.bgSoft, c.text) : "text-muted-foreground",
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
