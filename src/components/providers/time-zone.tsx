"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { TZ_COOKIE } from "@/lib/time-format";
import { useHydrated } from "@/hooks/use-now";

const TimeZoneContext = createContext<string | undefined>(undefined);

/**
 * The viewer's IANA time zone, remembered in a cookie so the server renders
 * clock times and greetings exactly as the browser will (no hydration
 * mismatch, no wrong-timezone flash).
 */
export function TimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string | undefined;
  children: ReactNode;
}) {
  useEffect(() => {
    const actual = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (actual && actual !== timeZone) {
      document.cookie = `${TZ_COOKIE}=${encodeURIComponent(actual)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [timeZone]);
  return <TimeZoneContext.Provider value={timeZone}>{children}</TimeZoneContext.Provider>;
}

/**
 * Time zone to format with, or null when it's not safe to format yet (no
 * cookie on the first visit and we're still hydrating) — render a placeholder.
 */
export function useTimeZone(): { tz: string | undefined; ready: boolean } {
  const tz = useContext(TimeZoneContext);
  const hydrated = useHydrated();
  return { tz, ready: Boolean(tz) || hydrated };
}
