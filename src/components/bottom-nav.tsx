"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, toolColors } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-3 inset-x-3 z-30 rounded-3xl border border-border/60 bg-card/85 backdrop-blur-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-4 px-1.5 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const c = toolColors[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-all",
                  active ? "" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center h-9 w-9 rounded-xl transition-all",
                    active
                      ? cn(c.bgSoft, c.text, "scale-110")
                      : "bg-transparent",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span
                  className={cn(
                    "text-[10.5px] leading-none font-medium transition-colors",
                    active ? c.text : "",
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
