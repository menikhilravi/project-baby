/** Compact "time since" / duration strings shared by rings, timers and toasts. */

/**
 * Wall-clock strings use a fixed locale and an explicit time zone (from the
 * `tz` cookie) so the server and the browser format identically.
 */
export const APP_LOCALE = "en-US";
export const TZ_COOKIE = "tz";

export function isTimeZone(value: string | undefined | null): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat(APP_LOCALE, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Hour of day (0–23) in a time zone. */
export function hourIn(date: Date, timeZone?: string): number {
  const h = new Intl.DateTimeFormat(APP_LOCALE, { hour: "numeric", hourCycle: "h23", timeZone }).format(date);
  return Number(h) % 24;
}

/** "Tuesday, Oct 13" */
export function formatDayLabel(date: Date, timeZone?: string): string {
  return date.toLocaleDateString(APP_LOCALE, { weekday: "long", month: "short", day: "numeric", timeZone });
}

/** YYYY-MM-DD calendar date in a time zone. */
export function ymdIn(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(date);
}

export function formatAgo(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem === 0 ? `${h}h ago` : `${h}h ${rem}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** "45m" / "2h 05m" — minutes resolution. */
export function formatSpan(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return `${h}h ${String(rem).padStart(2, "0")}m`;
}

/** Split for big ring readouts: { value: "2:05", unit: "h" } / { "45", "m" }. */
export function splitSpan(ms: number): { value: string; unit: string } {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 60) return { value: String(m), unit: "m" };
  const h = Math.floor(m / 60);
  if (h >= 24) return { value: String(Math.floor(h / 24)), unit: "d" };
  return { value: `${h}:${String(m % 60).padStart(2, "0")}`, unit: "h" };
}

/** Stopwatch "4:07" / "1:02:33" — seconds resolution, for live sessions. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function formatClockTime(iso: string | Date, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString(APP_LOCALE, { hour: "numeric", minute: "2-digit", timeZone });
}
