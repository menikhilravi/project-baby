"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePref } from "@/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
  { value: "night", label: "Night", icon: <Moon className="h-3.5 w-3.5" /> },
  { value: "system", label: "Auto", icon: <Monitor className="h-3.5 w-3.5" /> },
] as const satisfies readonly { value: ThemePref; label: string; icon: React.ReactNode }[];

export function ThemeToggle({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { pref, setPref } = useTheme();
  return (
    <SegmentedControl
      label="Theme"
      size={size}
      value={pref}
      onChange={(next, origin) => setPref(next, origin)}
      options={OPTIONS}
      className={className}
    />
  );
}
