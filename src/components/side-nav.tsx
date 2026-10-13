"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, m } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { visibleNavItems, toolColors, type Phase } from "@/lib/nav";
import { UserMenu } from "@/components/user-menu";
import { useNavProgress } from "@/components/nav-progress";
import { useBaby } from "@/components/providers/baby-context";
import { BabyMascot } from "@/components/mascot/baby-mascot";
import { useLiveMood } from "@/components/app-shell/app-header";
import { useQuickLogSheet } from "@/components/quick-log/quick-log-sheet";
import { formatBabyAge } from "@/lib/baby-age";
import { useTimeZone } from "@/components/providers/time-zone";
import { useNow } from "@/hooks/use-now";

export function SideNav({
  userEmail,
  phase,
  hiddenSections,
}: {
  userEmail?: string | null;
  phase: Phase;
  hiddenSections: readonly string[];
}) {
  const pathname = usePathname();
  const nav = useNavProgress();
  const pendingHref = nav?.pendingHref ?? null;
  const items = visibleNavItems(phase, hiddenSections);
  const baby = useBaby();
  const mood = useLiveMood();
  const quick = useQuickLogSheet();
  const tick = useNow(60_000);
  const { tz, ready } = useTimeZone();
  const age = ready ? formatBabyAge(baby.birthDate, tick ? new Date(tick) : new Date(), tz) : null;

  return (
    <aside
      className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border/70 bg-sidebar backdrop-blur-xl z-30"
      style={{ viewTransitionName: "side-nav" }}
    >
      <Link
        href="/"
        className="group m-3 flex items-center gap-3 rounded-[1.4rem] bg-accent-baby-soft p-3 transition-transform active:scale-[0.98]"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-card/70 shadow-soft">
          <BabyMascot mood={mood} size={50} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-lg font-semibold">{baby.name ?? "Parent Prep"}</span>
          <span className="block truncate text-xs font-semibold text-accent-baby-strong">
            {age ?? "Take it one little day at a time"}
          </span>
        </span>
      </Link>

      {phase === "postnatal" ? (
        <button
          type="button"
          onClick={() => quick.open()}
          className="mx-3 mb-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-accent-baby text-sm font-bold text-accent-baby-fg shadow-squish transition-[transform,box-shadow] ease-squish active:translate-y-0.5 active:shadow-squish-pressed"
        >
          <Plus className="h-4 w-4" strokeWidth={2.8} /> Log something
        </button>
      ) : null}

      <LayoutGroup id="side-nav">
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            // Optimistic highlight: follow the tapped route until it lands.
            const active = pendingHref
              ? item.href === pendingHref
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const c = toolColors[item.key];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => nav?.start(item.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm font-semibold transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <m.span
                    layoutId="side-pill"
                    transition={spring.snappy}
                    className="absolute inset-0 rounded-2xl bg-card shadow-soft ring-1 ring-border/60"
                  />
                ) : null}
                <span
                  className={cn(
                    "relative grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl transition-colors",
                    active ? cn(c.bgSoft, c.text) : "bg-muted/70 group-hover:bg-muted",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>

      {userEmail ? <UserMenu email={userEmail} /> : null}
    </aside>
  );
}
