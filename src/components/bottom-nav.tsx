"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, m } from "motion/react";
import { LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import {
  BOTTOM_PRIMARY,
  toolColors,
  visibleNavItems,
  type NavItem,
  type Phase,
} from "@/lib/nav";
import { useNavProgress } from "@/components/nav-progress";
import { useQuickLogSheet } from "@/components/quick-log/quick-log-sheet";
import { MoreSheet } from "@/components/app-shell/more-sheet";

/** Pick the bar's slots: phase primaries (if visible), topped up to three. */
function splitItems(phase: Phase, hiddenSections: readonly string[]) {
  const visible = visibleNavItems(phase, hiddenSections);
  const byKey = new Map(visible.map((i) => [i.key, i]));
  const { left, right } = BOTTOM_PRIMARY[phase];
  const l = left.map((k) => byKey.get(k)).filter(Boolean) as NavItem[];
  const r = right.map((k) => byKey.get(k)).filter(Boolean) as NavItem[];
  const used = new Set([...l, ...r].map((i) => i.key));
  for (const item of visible) {
    if (l.length + r.length >= 3) break;
    if (used.has(item.key)) continue;
    (l.length < 2 ? l : r).push(item);
    used.add(item.key);
  }
  const rest = visible.filter((i) => !used.has(i.key));
  return { left: l, right: r, rest };
}

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
  const quick = useQuickLogSheet();
  const [moreOpen, setMoreOpen] = useState(false);
  const { left, right, rest } = splitItems(phase, hiddenSections);
  const showFab = phase === "postnatal";

  const isActive = (href: string) =>
    pendingHref ? href === pendingHref : pathname === href || pathname.startsWith(href + "/");
  const moreActive = !pendingHref && rest.some((i) => isActive(i.href));

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const c = toolColors[item.key];
    return (
      <li key={item.href} className="flex-1">
        <Link
          href={item.href}
          onClick={() => {
            haptic("tick");
            nav?.start(item.href);
          }}
          aria-current={active ? "page" : undefined}
          className="relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong"
        >
          {active ? (
            <m.span
              layoutId="nav-pill"
              transition={spring.snappy}
              className={cn("absolute inset-x-1 inset-y-1 rounded-2xl", c.bgSoft)}
            />
          ) : null}
          <m.span
            className={cn("relative", active ? c.text : "text-muted-foreground")}
            animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
            transition={spring.squish}
          >
            <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 2} />
          </m.span>
          <span
            className={cn(
              "relative text-[10.5px] font-bold leading-none",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="md:hidden fixed inset-x-3 z-40 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)]"
        style={{ viewTransitionName: "bottom-nav" }}
      >
        <LayoutGroup id="bottom-nav">
          <ul className="glass relative flex items-center gap-0.5 rounded-[1.75rem] px-1.5 shadow-pop ring-1 ring-border/70">
            {left.map(renderItem)}
            {showFab ? (
              <li className="flex w-[72px] shrink-0 justify-center">
                <m.button
                  type="button"
                  aria-label="Log something"
                  aria-haspopup="dialog"
                  aria-expanded={quick.isOpen}
                  onClick={() => {
                    haptic("tap");
                    quick.open();
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={spring.squish}
                  className="-mt-7 grid h-[60px] w-[60px] place-items-center rounded-full text-accent-baby-fg shadow-pop ring-4 ring-background bg-[linear-gradient(140deg,var(--accent-baby),color-mix(in_oklab,var(--accent-baby)_65%,var(--kind-feed)))] outline-none focus-visible:ring-accent-baby-strong"
                >
                  <m.span animate={{ rotate: quick.isOpen ? 45 : 0 }} transition={spring.snappy}>
                    <Plus className="h-7 w-7" strokeWidth={2.8} />
                  </m.span>
                </m.button>
              </li>
            ) : null}
            {right.map(renderItem)}
            {rest.length ? (
              <li className="flex-1">
                <button
                  type="button"
                  onClick={() => {
                    haptic("tick");
                    setMoreOpen(true);
                  }}
                  aria-haspopup="dialog"
                  className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong"
                >
                  {moreActive ? (
                    <m.span
                      layoutId="nav-pill"
                      transition={spring.snappy}
                      className="absolute inset-x-1 inset-y-1 rounded-2xl bg-accent-baby-soft"
                    />
                  ) : null}
                  <LayoutGrid
                    className={cn("relative h-[21px] w-[21px]", moreActive ? "text-accent-baby-strong" : "text-muted-foreground")}
                  />
                  <span
                    className={cn(
                      "relative text-[10.5px] font-bold leading-none",
                      moreActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    More
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </LayoutGroup>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} items={rest} />
    </>
  );
}
