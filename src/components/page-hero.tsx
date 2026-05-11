import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolColors, type ToolKey } from "@/lib/nav";

type Props = {
  tool: ToolKey;
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  subtitle?: string;
};

export function PageHero({ tool, icon: Icon, title, eyebrow, subtitle }: Props) {
  const c = toolColors[tool];
  return (
    <header className="mb-6 flex items-start gap-3.5">
      <span
        className={cn(
          "shrink-0 grid place-items-center h-11 w-11 rounded-2xl ring-1 ring-border/50 shadow-sm mt-0.5",
          c.bgSoft,
          c.text,
        )}
      >
        <Icon className="h-5.5 w-5.5" />
      </span>
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className={cn(
              "text-[10px] uppercase tracking-[0.20em] font-semibold mb-0.5",
              c.text,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
