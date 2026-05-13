import {
  ShoppingCart,
  Heart,
  BriefcaseMedical,
  CreditCard,
  Baby,
  Moon,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type Phase = "prenatal" | "postnatal";

export type ToolKey =
  | "gear"
  | "names"
  | "hospital"
  | "rewards"
  | "nursery"
  | "logger"
  | "notes";

export type NavItem = {
  href: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  key: ToolKey;
  phases?: Phase[];
};

export const navItems: NavItem[] = [
  {
    href: "/log",
    label: "Night Shift",
    tagline: "Tap to log feeds, diapers, sleep.",
    icon: Moon,
    key: "logger",
    phases: ["postnatal"],
  },
  {
    href: "/gear",
    label: "Price Pulse",
    tagline: "Track gear, buy at the right moment.",
    icon: ShoppingCart,
    key: "gear",
  },
  {
    href: "/names",
    label: "Names",
    tagline: "Swipe through names — find a favorite.",
    icon: Heart,
    key: "names",
  },
  {
    href: "/hospital",
    label: "Go Bag",
    tagline: "Pack what you need for the big day.",
    icon: BriefcaseMedical,
    key: "hospital",
    phases: ["prenatal"],
  },
  {
    href: "/rewards",
    label: "Findummy Opt",
    tagline: "Pick the best card for every purchase.",
    icon: CreditCard,
    key: "rewards",
  },
  {
    href: "/nursery",
    label: "Nursery",
    tagline: "Get the nest ready.",
    icon: Baby,
    key: "nursery",
  },
  {
    href: "/notes",
    label: "Notes",
    tagline: "Pediatrician info, dosages, numbers.",
    icon: BookOpen,
    key: "notes",
  },
];

export function navItemsForPhase(phase: Phase): NavItem[] {
  return navItems.filter((item) => !item.phases || item.phases.includes(phase));
}

/**
 * Static class strings per tool — Tailwind's JIT cannot scan dynamic
 * `bg-${key}` strings, so we keep the literal classes here.
 */
export const toolColors: Record<
  ToolKey,
  {
    bg: string;
    bgSoft: string;
    text: string;
    border: string;
    ring: string;
    gradientFrom: string;
    gradientVia: string;
  }
> = {
  gear: {
    bg: "bg-gear",
    bgSoft: "bg-gear-soft",
    text: "text-gear",
    border: "border-gear",
    ring: "ring-gear",
    gradientFrom: "from-gear-soft",
    gradientVia: "via-gear-soft/60",
  },
  names: {
    bg: "bg-names",
    bgSoft: "bg-names-soft",
    text: "text-names",
    border: "border-names",
    ring: "ring-names",
    gradientFrom: "from-names-soft",
    gradientVia: "via-names-soft/60",
  },
  hospital: {
    bg: "bg-hospital",
    bgSoft: "bg-hospital-soft",
    text: "text-hospital",
    border: "border-hospital",
    ring: "ring-hospital",
    gradientFrom: "from-hospital-soft",
    gradientVia: "via-hospital-soft/60",
  },
  rewards: {
    bg: "bg-rewards",
    bgSoft: "bg-rewards-soft",
    text: "text-rewards",
    border: "border-rewards",
    ring: "ring-rewards",
    gradientFrom: "from-rewards-soft",
    gradientVia: "via-rewards-soft/60",
  },
  nursery: {
    bg: "bg-nursery",
    bgSoft: "bg-nursery-soft",
    text: "text-nursery",
    border: "border-nursery",
    ring: "ring-nursery",
    gradientFrom: "from-nursery-soft",
    gradientVia: "via-nursery-soft/60",
  },
  logger: {
    bg: "bg-logger",
    bgSoft: "bg-logger-soft",
    text: "text-logger",
    border: "border-logger",
    ring: "ring-logger",
    gradientFrom: "from-logger-soft",
    gradientVia: "via-logger-soft/60",
  },
  notes: {
    bg: "bg-notes",
    bgSoft: "bg-notes-soft",
    text: "text-notes",
    border: "border-notes",
    ring: "ring-notes",
    gradientFrom: "from-notes-soft",
    gradientVia: "via-notes-soft/60",
  },
};
