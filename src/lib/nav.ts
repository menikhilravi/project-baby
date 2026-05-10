import {
  ShoppingCart,
  Heart,
  BriefcaseMedical,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type ToolKey = "gear" | "names" | "hospital" | "rewards";

export type NavItem = {
  href: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  key: ToolKey;
};

export const navItems: NavItem[] = [
  {
    href: "/gear",
    label: "Price Pulse",
    tagline: "Track gear, buy at the right moment.",
    icon: ShoppingCart,
    key: "gear",
  },
  {
    href: "/names",
    label: "Name Bracket",
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
  },
  {
    href: "/rewards",
    label: "Findummy Opt",
    tagline: "Pick the best card for every purchase.",
    icon: CreditCard,
    key: "rewards",
  },
];

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
};
