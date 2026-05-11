"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, toolColors } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/80 backdrop-blur-2xl border-t border-border/40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
    >
      <ul className="grid grid-cols-4 px-2 pt-1.5 pb-1">
        {navItems.map((item) => {
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
