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
    <header className="mb-8 md:mb-11 flex items-start gap-3.5">
      <span
        className={cn(
          "shrink-0 grid place-items-center h-11 w-11 rounded-2xl border border-border mt-1",
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
              "text-[11px] uppercase tracking-[0.2em] font-semibold mb-1.5",
              c.text,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[2rem] md:text-[2.6rem] font-bold tracking-[-0.035em] leading-[1.02]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
