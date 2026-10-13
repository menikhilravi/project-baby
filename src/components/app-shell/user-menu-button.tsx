"use client";

import { useRef } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Check, LogOut, Monitor, Moon, Settings, Sun, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePref } from "@/lib/theme";

const itemClass =
  "flex h-11 cursor-default select-none items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none data-[highlighted]:bg-muted";

/** Avatar button → menu with theme, settings, couple and sign out. */
export function UserMenuButton({ email, className }: { email: string; className?: string }) {
  const { pref, setPref } = useTheme();
  const signOut = useRef<HTMLFormElement>(null);
  const initial = (email.split("@")[0]?.[0] ?? "?").toUpperCase();

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Account and settings"
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full bg-accent-baby-soft font-display text-sm font-semibold text-accent-baby-strong ring-1 ring-border/60 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-accent-baby-strong",
            className,
          )}
        >
          {initial}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="end" className="z-[75]">
            <Menu.Popup
              className={cn(
                "w-64 origin-(--transform-origin) rounded-[1.4rem] bg-popover p-1.5 text-popover-foreground shadow-pop ring-1 ring-border/70 outline-none",
                "transition-[transform,opacity] duration-200 ease-squish data-[starting-style]:scale-90 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              )}
            >
              <p className="truncate px-3 pb-1 pt-2 text-xs text-muted-foreground" title={email}>
                {email}
              </p>
              <Menu.Group>
                <Menu.GroupLabel className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Theme
                </Menu.GroupLabel>
                <Menu.RadioGroup value={pref} onValueChange={(v) => setPref(v as ThemePref)}>
                  {(
                    [
                      ["light", "Light", Sun],
                      ["night", "Night", Moon],
                      ["system", "Match phone", Monitor],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <Menu.RadioItem key={value} value={value} closeOnClick className={itemClass}>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{label}</span>
                      <Menu.RadioItemIndicator>
                        <Check className="h-4 w-4 text-accent-baby-strong" />
                      </Menu.RadioItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Group>
              <Menu.Separator className="mx-2 my-1.5 h-px bg-border" />
              <Menu.LinkItem render={<Link href="/settings" />} className={itemClass}>
                <Settings className="h-4 w-4 text-muted-foreground" /> Settings
              </Menu.LinkItem>
              <Menu.LinkItem render={<Link href="/names/couple" />} className={itemClass}>
                <Users className="h-4 w-4 text-muted-foreground" /> Couple
              </Menu.LinkItem>
              <Menu.Item onClick={() => signOut.current?.requestSubmit()} className={cn(itemClass, "text-destructive")}>
                <LogOut className="h-4 w-4" /> Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <form ref={signOut} action="/auth/signout" method="post" hidden />
    </>
  );
}
