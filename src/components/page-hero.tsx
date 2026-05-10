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
    <header className="mb-7 flex items-start gap-4">
      <span
        className={cn(
          "shrink-0 grid place-items-center h-14 w-14 rounded-2xl ring-1 ring-border/60 shadow-sm",
          c.bgSoft,
          c.text,
        )}
      >
        <Icon className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className={cn(
              "text-[11px] uppercase tracking-[0.18em] font-medium",
              c.text,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[15px] text-muted-foreground max-w-prose">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
