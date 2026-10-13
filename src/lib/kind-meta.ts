/**
 * Single source of truth for the baby_events "kind" enum: its icon, labels,
 * accent color, and whether it carries a duration. Shared by the /today
 * summary tiles, the /log/[kind] detail pages, the timeline, and the editor.
 */

import {
  Droplets,
  Milk,
  Moon,
  Pill,
  Star,
  Thermometer,
  Timer,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export type EventKind =
  | "feed"
  | "diaper"
  | "sleep"
  | "temp"
  | "med"
  | "pump"
  | "tummy"
  | "milestone";

export type KindMeta = {
  /** Singular label, e.g. "Feed". */
  label: string;
  /** Plural / collection label, e.g. "Feeds" — used for detail page headers. */
  plural: string;
  icon: LucideIcon;
  /** Tailwind text-color class for the icon (alias of `tone.text`). */
  accent: string;
  /** Literal token classes — Tailwind can't see dynamic `bg-kind-${k}`. */
  tone: KindTone;
  /** CSS color for SVG/recharts fills. */
  cssVar: string;
  /** True when the event spans occurred_at → ended_at (start + end times). */
  hasDuration: boolean;
};

export type KindTone = {
  /** Solid (icon/mark) text color. */
  text: string;
  /** Text-safe color for labels on the soft wash. */
  strong: string;
  bg: string;
  bgSoft: string;
  ring: string;
  fill: string;
  stroke: string;
};

const TONES: Record<EventKind, KindTone> = {
  feed: {
    text: "text-kind-feed",
    strong: "text-kind-feed-strong",
    bg: "bg-kind-feed",
    bgSoft: "bg-kind-feed-soft",
    ring: "ring-kind-feed",
    fill: "fill-kind-feed",
    stroke: "stroke-kind-feed",
  },
  diaper: {
    text: "text-kind-diaper",
    strong: "text-kind-diaper-strong",
    bg: "bg-kind-diaper",
    bgSoft: "bg-kind-diaper-soft",
    ring: "ring-kind-diaper",
    fill: "fill-kind-diaper",
    stroke: "stroke-kind-diaper",
  },
  sleep: {
    text: "text-kind-sleep",
    strong: "text-kind-sleep-strong",
    bg: "bg-kind-sleep",
    bgSoft: "bg-kind-sleep-soft",
    ring: "ring-kind-sleep",
    fill: "fill-kind-sleep",
    stroke: "stroke-kind-sleep",
  },
  temp: {
    text: "text-kind-temp",
    strong: "text-kind-temp-strong",
    bg: "bg-kind-temp",
    bgSoft: "bg-kind-temp-soft",
    ring: "ring-kind-temp",
    fill: "fill-kind-temp",
    stroke: "stroke-kind-temp",
  },
  med: {
    text: "text-kind-med",
    strong: "text-kind-med-strong",
    bg: "bg-kind-med",
    bgSoft: "bg-kind-med-soft",
    ring: "ring-kind-med",
    fill: "fill-kind-med",
    stroke: "stroke-kind-med",
  },
  pump: {
    text: "text-kind-pump",
    strong: "text-kind-pump-strong",
    bg: "bg-kind-pump",
    bgSoft: "bg-kind-pump-soft",
    ring: "ring-kind-pump",
    fill: "fill-kind-pump",
    stroke: "stroke-kind-pump",
  },
  tummy: {
    text: "text-kind-tummy",
    strong: "text-kind-tummy-strong",
    bg: "bg-kind-tummy",
    bgSoft: "bg-kind-tummy-soft",
    ring: "ring-kind-tummy",
    fill: "fill-kind-tummy",
    stroke: "stroke-kind-tummy",
  },
  milestone: {
    text: "text-kind-milestone",
    strong: "text-kind-milestone-strong",
    bg: "bg-kind-milestone",
    bgSoft: "bg-kind-milestone-soft",
    ring: "ring-kind-milestone",
    fill: "fill-kind-milestone",
    stroke: "stroke-kind-milestone",
  },
};

export const KIND_META: Record<EventKind, KindMeta> = {
  feed: {
    label: "Feed",
    plural: "Feeds",
    icon: Utensils,
    accent: "text-kind-feed",
    tone: TONES.feed,
    cssVar: "var(--kind-feed)",
    hasDuration: false,
  },
  diaper: {
    label: "Diaper",
    plural: "Diapers",
    icon: Droplets,
    accent: "text-kind-diaper",
    tone: TONES.diaper,
    cssVar: "var(--kind-diaper)",
    hasDuration: false,
  },
  sleep: {
    label: "Sleep",
    plural: "Sleep",
    icon: Moon,
    accent: "text-kind-sleep",
    tone: TONES.sleep,
    cssVar: "var(--kind-sleep)",
    hasDuration: true,
  },
  temp: {
    label: "Temp",
    plural: "Temperature",
    icon: Thermometer,
    accent: "text-kind-temp",
    tone: TONES.temp,
    cssVar: "var(--kind-temp)",
    hasDuration: false,
  },
  med: {
    label: "Medicine",
    plural: "Medicine",
    icon: Pill,
    accent: "text-kind-med",
    tone: TONES.med,
    cssVar: "var(--kind-med)",
    hasDuration: false,
  },
  pump: {
    label: "Pump",
    plural: "Pumping",
    icon: Milk,
    accent: "text-kind-pump",
    tone: TONES.pump,
    cssVar: "var(--kind-pump)",
    hasDuration: false,
  },
  tummy: {
    label: "Tummy time",
    plural: "Tummy time",
    icon: Timer,
    accent: "text-kind-tummy",
    tone: TONES.tummy,
    cssVar: "var(--kind-tummy)",
    hasDuration: true,
  },
  milestone: {
    label: "Milestone",
    plural: "Milestones",
    icon: Star,
    accent: "text-kind-milestone",
    tone: TONES.milestone,
    cssVar: "var(--kind-milestone)",
    hasDuration: false,
  },
};

export const EVENT_KINDS = Object.keys(KIND_META) as EventKind[];

export function isEventKind(value: string): value is EventKind {
  return value in KIND_META;
}
