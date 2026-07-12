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
  /** Tailwind text-color class for the icon. */
  accent: string;
  /** True when the event spans occurred_at → ended_at (start + end times). */
  hasDuration: boolean;
};

export const KIND_META: Record<EventKind, KindMeta> = {
  feed: {
    label: "Feed",
    plural: "Feeds",
    icon: Utensils,
    accent: "text-amber-500",
    hasDuration: false,
  },
  diaper: {
    label: "Diaper",
    plural: "Diapers",
    icon: Droplets,
    accent: "text-sky-500",
    hasDuration: false,
  },
  sleep: {
    label: "Sleep",
    plural: "Sleep",
    icon: Moon,
    accent: "text-indigo-400",
    hasDuration: true,
  },
  temp: {
    label: "Temp",
    plural: "Temperature",
    icon: Thermometer,
    accent: "text-rose-500",
    hasDuration: false,
  },
  med: {
    label: "Medicine",
    plural: "Medicine",
    icon: Pill,
    accent: "text-violet-500",
    hasDuration: false,
  },
  pump: {
    label: "Pump",
    plural: "Pumping",
    icon: Milk,
    accent: "text-sky-500",
    hasDuration: false,
  },
  tummy: {
    label: "Tummy time",
    plural: "Tummy time",
    icon: Timer,
    accent: "text-emerald-500",
    hasDuration: true,
  },
  milestone: {
    label: "Milestone",
    plural: "Milestones",
    icon: Star,
    accent: "text-reports",
    hasDuration: false,
  },
};

export const EVENT_KINDS = Object.keys(KIND_META) as EventKind[];

export function isEventKind(value: string): value is EventKind {
  return value in KIND_META;
}
