import { ymdIn } from "./time-format";

/**
 * Friendly baby age for headers: "Born today", "5 days", "3w 2d", "4mo 1w",
 * "1y 2mo". birthDate is a YYYY-MM-DD calendar date; "today" is taken in the
 * viewer's time zone so server and browser agree.
 */
function utcDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function babyAgeDays(birthDate: string, now: Date = new Date(), timeZone?: string): number {
  return Math.round((utcDay(ymdIn(now, timeZone)) - utcDay(birthDate)) / 86_400_000);
}

export function formatBabyAge(
  birthDate: string | null,
  now: Date = new Date(),
  timeZone?: string,
): string | null {
  if (!birthDate) return null;
  const days = babyAgeDays(birthDate, now, timeZone);
  if (days < 0) {
    const weeksToGo = Math.ceil(-days / 7);
    return weeksToGo <= 1 ? `Due in ${-days}d` : `Due in ${weeksToGo}w`;
  }
  if (days === 0) return "Born today";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} old`;
  if (days < 7 * 13) {
    const w = Math.floor(days / 7);
    const d = days % 7;
    return d ? `${w}w ${d}d old` : `${w} weeks old`;
  }
  const [y, m, d] = birthDate.split("-").map(Number);
  const [ty, tm, td] = ymdIn(now, timeZone).split("-").map(Number);
  let months = (ty - y) * 12 + (tm - m);
  if (td < d) months -= 1;
  if (months < 24) {
    const anchor = Date.UTC(y, m - 1 + months, d);
    const extraWeeks = Math.floor((utcDay(`${ty}-${tm}-${td}`) - anchor) / (7 * 86_400_000));
    return extraWeeks > 0 ? `${months}mo ${extraWeeks}w old` : `${months} months old`;
  }
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years}y ${rem}mo old` : `${years} years old`;
}
