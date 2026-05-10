"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, toolColors } from "@/lib/nav";
import { UserMenu } from "@/components/user-menu";

export function SideNav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-md z-30">
      <Link
        href="/gear"
        className="flex items-center gap-3 px-6 py-5 border-b border-border/60 group"
      >
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-names-soft via-rewards-soft to-hospital-soft ring-1 ring-border/60 transition-transform group-hover:scale-105">
          <Baby className="h-5 w-5 text-foreground/80" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-lg font-semibold tracking-tight">
            Parent Prep
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Hub
          </span>
        </span>
      </Link>

      <nav className="flex-1 px-3 py-5 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const c = toolColors[item.key];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-card shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center h-9 w-9 rounded-xl transition-all",
                  active
                    ? cn(c.bgSoft, c.text)
                    : "bg-muted text-muted-foreground group-hover:bg-card",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "font-medium",
                    active ? "text-foreground" : "",
                  )}
                >
                  {item.label}
                </span>
                <span className="text-[11px] text-muted-foreground/80 line-clamp-1">
                  {item.tagline}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {userEmail ? (
        <UserMenu email={userEmail} variant="side" />
      ) : (
        <div className="px-5 py-4 border-t border-border/60">
          <p className="font-display text-xs leading-relaxed text-muted-foreground italic">
            “Take it one little day at a time.”
          </p>
        </div>
      )}
    </aside>
  );
}
