"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolColors, type NavItem } from "@/lib/nav";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useNavProgress } from "@/components/nav-progress";

/** Everything that doesn't fit in the bottom bar, as a friendly grid. */
export function MoreSheet({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
}) {
  const nav = useNavProgress();
  const go = (href: string) => {
    nav?.start(href);
    onOpenChange(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Everything else">
      <ul className="grid grid-cols-3 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const c = toolColors[item.key];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => go(item.href)}
                className="flex flex-col items-center gap-2 rounded-tile bg-card px-2 py-4 text-center shadow-soft ring-1 ring-border/60 transition-transform active:scale-95"
              >
                <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", c.bgSoft, c.text)}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-bold leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Theme</p>
        <ThemeToggle size="md" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/settings"
            onClick={() => go("/settings")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-bold"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <Link
            href="/names/couple"
            onClick={() => go("/names/couple")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-bold"
          >
            <Users className="h-4 w-4" /> Couple
          </Link>
        </div>
      </div>
    </Sheet>
  );
}
