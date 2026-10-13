import { ViewTransition, type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolColors, type ToolKey } from "@/lib/nav";
import { BabyMascot, type MascotMood } from "@/components/mascot/baby-mascot";

type Props = {
  tool: ToolKey;
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Override the tool colours (e.g. a baby_events kind tone). */
  tone?: { bgSoft: string; text: string };
  /** Show the baby mascot beside the title. */
  mascot?: MascotMood;
  /** Right-aligned actions (buttons, links). */
  actions?: ReactNode;
  /** Shared-element name: the icon morphs from a matching element on the previous page. */
  morphName?: string;
};

export function PageHero({
  tool,
  icon: Icon,
  title,
  eyebrow,
  subtitle,
  tone,
  mascot,
  actions,
  morphName,
}: Props) {
  const c = tone ?? toolColors[tool];
  const iconBlob = (
    <span
      className={cn(
        "grid place-items-center h-12 w-12 rounded-[1.15rem] shadow-squish",
        c.bgSoft,
        c.text,
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2.2} />
    </span>
  );

  return (
    <header className="relative mb-8 md:mb-10">
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          {morphName ? (
            <ViewTransition name={morphName} share="morph" default="none">
              {iconBlob}
            </ViewTransition>
          ) : (
            iconBlob
          )}
        </div>
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 mb-2 text-[11px] uppercase tracking-[0.14em] font-bold",
                c.bgSoft,
                c.text,
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-[1.85rem] md:text-[2.4rem] font-semibold tracking-[-0.015em] leading-[1.08] text-balance">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed text-pretty">
              {subtitle}
            </p>
          ) : null}
        </div>
        {mascot ? (
          <BabyMascot mood={mascot} size={72} className="hidden sm:block -mt-2 -mr-1" />
        ) : null}
        {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
      </div>
    </header>
  );
}
