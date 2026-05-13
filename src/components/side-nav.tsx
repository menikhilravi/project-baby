"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Baby } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemsForPhase, toolColors, type Phase } from "@/lib/nav";
import { UserMenu } from "@/components/user-menu";

export function SideNav({
  userEmail,
  phase,
}: {
  userEmail?: string | null;
  phase: Phase;
}) {
  const pathname = usePathname();
  const items = navItemsForPhase(phase);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border/50 bg-sidebar z-30">
      <Link
        href="/gear"
        className="flex items-center gap-3 px-5 py-5 border-b border-border/50 group"
      >
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br from-names-soft via-rewards-soft to-hospital-soft ring-1 ring-border/40 transition-all group-hover:scale-105 group-hover:ring-border/60">
          <Baby className="h-4.5 w-4.5 text-foreground/70" />
        </span>
        <span className="font-display text-[15px] font-semibold tracking-tight text-foreground/90">
          Parent Prep
        </span>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const c = toolColors[item.key];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-card/80 text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-card/40 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center h-8 w-8 rounded-lg transition-all flex-shrink-0",
                  active
                    ? cn(c.bgSoft, c.text)
                    : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground/70",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-medium tracking-[-0.01em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {userEmail ? (
        <UserMenu email={userEmail} variant="side" />
      ) : (
        <div className="px-5 py-4 border-t border-border/50">
          <p className="font-display text-xs leading-relaxed text-muted-foreground/70 italic">
            &ldquo;Take it one little day at a time.&rdquo;
          </p>
        </div>
      )}
    </aside>
  );
}
