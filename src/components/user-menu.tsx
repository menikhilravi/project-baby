import Link from "next/link";
import { LogOut, Settings, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const linkClass =
  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** Sidebar footer: theme, settings, couple, sign out. */
export function UserMenu({ email }: { email: string }) {
  return (
    <div className="space-y-2.5 border-t border-border/70 px-3 py-3">
      <ThemeToggle />
      <div className="flex items-center gap-1">
        <Link href="/settings" className={linkClass}>
          <Settings className="h-3.5 w-3.5" /> Settings
        </Link>
        <Link href="/names/couple" className={linkClass}>
          <Users className="h-3.5 w-3.5" /> Couple
        </Link>
        <form action="/auth/signout" method="post" className="flex flex-1">
          <button type="submit" title={`Sign out ${email}`} className={linkClass}>
            <LogOut className="h-3.5 w-3.5" /> Out
          </button>
        </form>
      </div>
    </div>
  );
}
