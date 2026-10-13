"use client";

import Link from "next/link";
import { useBaby } from "@/components/providers/baby-context";
import { useBabyLive } from "@/components/live/baby-live-provider";
import { BabyMascot, type MascotMood } from "@/components/mascot/baby-mascot";
import { useNow } from "@/hooks/use-now";
import { formatBabyAge } from "@/lib/baby-age";
import { useTimeZone } from "@/components/providers/time-zone";
import { UserMenuButton } from "./user-menu-button";

/** Hook for the mascot's mood from live state (shared by header + sidebar). */
export function useLiveMood(): MascotMood {
  const { state } = useBabyLive();
  if (state.openSleep) return "sleeping";
  if (state.openNursing) return "feeding";
  return "idle";
}

/** Mobile top bar: the baby (live mood), name + age, account menu. */
export function AppHeader({ email }: { email: string }) {
  const baby = useBaby();
  const mood = useLiveMood();
  const tick = useNow(60_000);
  const { tz, ready } = useTimeZone();
  const age = ready ? formatBabyAge(baby.birthDate, tick ? new Date(tick) : new Date(), tz) : null;

  return (
    <header
      className="md:hidden glass fixed inset-x-0 top-0 z-40 border-b border-border/60 pt-[env(safe-area-inset-top)]"
      style={{ viewTransitionName: "app-header" }}
    >
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent-baby-strong">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-baby-soft">
            <BabyMascot mood={mood} size={36} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[17px] font-semibold">
              {baby.name ?? "Baby"}
            </span>
            {age ? (
              <span className="block truncate text-xs font-semibold text-muted-foreground">
                {age}
              </span>
            ) : null}
          </span>
        </Link>
        <UserMenuButton email={email} />
      </div>
    </header>
  );
}
