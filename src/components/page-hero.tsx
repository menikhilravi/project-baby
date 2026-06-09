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
    <header className="mb-7 md:mb-9 flex items-start gap-3.5">
      <span
        className={cn(
          "shrink-0 grid place-items-center h-11 w-11 rounded-2xl border border-border/60 mt-0.5",
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
              "text-[10px] uppercase tracking-[0.22em] font-semibold mb-1",
              c.text,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[1.7rem] md:text-[2.1rem] font-bold tracking-[-0.03em] leading-[1.05]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
