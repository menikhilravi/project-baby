/**
 * Deterministic, rule-based "gentle nudges" derived from the tracked data.
 * No AI — just a few honest observations. Returns at most `limit` lines.
 */
import {
  type RawEvent,
  dayBuckets,
  feedHourHistogram,
  formatDuration,
  rangeStats,
} from "./baby-stats";

export type Insight = { id: string; text: string; tone: "good" | "neutral" };

export function buildInsights(
  events: RawEvent[],
  now: Date = new Date(),
  limit = 3,
): Insight[] {
  // Two 7-day windows for week-over-week comparison.
  const buckets14 = dayBuckets(events, 14, now);
  const lastWeek = buckets14.slice(7);
  const prevWeek = buckets14.slice(0, 7);
  const out: Insight[] = [];

  const thisStats = rangeStats(lastWeek);
  const prevStats = rangeStats(prevWeek);

  // 1. Longest sleep stretch trend.
  if (thisStats.longestSleepMin > 0) {
    const delta = thisStats.longestSleepMin - prevStats.longestSleepMin;
    if (prevStats.longestSleepMin > 0 && delta >= 20) {
      out.push({
        id: "stretch-up",
        tone: "good",
        text: `Longest sleep stretch is up ${formatDuration(delta)} from last week — now ${formatDuration(thisStats.longestSleepMin)}.`,
      });
    } else {
      out.push({
        id: "stretch",
        tone: "neutral",
        text: `Longest sleep stretch this week: ${formatDuration(thisStats.longestSleepMin)}.`,
      });
    }
  }

  // 2. Average sleep per day.
  if (thisStats.avgSleepHours > 0) {
    out.push({
      id: "avg-sleep",
      tone: "neutral",
      text: `Averaging ${thisStats.avgSleepHours.toFixed(1)}h of logged sleep a day.`,
    });
  }

  // 3. Feed clustering — find the busiest 3-hour window.
  const hours = feedHourHistogram(events, 7, now);
  const totalFeeds = hours.reduce((s, n) => s + n, 0);
  if (totalFeeds >= 6) {
    let bestStart = 0;
    let bestSum = -1;
    for (let h = 0; h < 24; h++) {
      const sum = hours[h] + hours[(h + 1) % 24] + hours[(h + 2) % 24];
      if (sum > bestSum) {
        bestSum = sum;
        bestStart = h;
      }
    }
    if (bestSum >= 3) {
      out.push({
        id: "feed-cluster",
        tone: "neutral",
        text: `Feeds cluster most around ${hourLabel(bestStart)}–${hourLabel((bestStart + 3) % 24)}.`,
      });
    }
  }

  // 4. Feeds-per-day trend.
  if (prevStats.avgFeeds > 0 && thisStats.avgFeeds > 0) {
    const diff = thisStats.avgFeeds - prevStats.avgFeeds;
    if (Math.abs(diff) >= 1) {
      out.push({
        id: "feed-trend",
        tone: "neutral",
        text:
          diff > 0
            ? `Feeds per day up ${diff.toFixed(0)} vs last week.`
            : `Feeds per day down ${Math.abs(diff).toFixed(0)} vs last week.`,
      });
    }
  }

  return out.slice(0, limit);
}

function hourLabel(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}
