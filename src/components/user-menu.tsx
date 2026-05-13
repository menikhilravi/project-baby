import Link from "next/link";
import { LogOut, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function initialsFrom(email: string) {
  const local = email.split("@")[0] ?? "";
  return (local[0] ?? "?").toUpperCase();
}

export function UserMenu({
  email,
  variant = "side",
}: {
  email: string;
  variant?: "side" | "mobile";
}) {
  const initial = initialsFrom(email);

  if (variant === "mobile") {
    return (
      <div className="md:hidden fixed top-3 right-3 z-40 flex items-center gap-1.5">
        <Link
          href="/names/couple"
          aria-label="Couple settings"
          className="flex items-center justify-center h-8 w-8 rounded-full bg-card/70 ring-1 ring-border/40 shadow-sm text-muted-foreground hover:text-foreground transition-all active:scale-95"
        >
          <Users className="h-3.5 w-3.5" />
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label={`Sign out ${email}`}
            title={email}
            className={cn(
              "flex items-center gap-1.5 rounded-full bg-card/70 ring-1 ring-border/40 shadow-sm",
              "pl-1 pr-2.5 py-1 text-[11px] font-medium hover:bg-card/90 transition-all active:scale-95",
            )}
          >
            <span className="grid place-items-center h-6 w-6 rounded-full bg-gradient-to-br from-names-soft to-rewards-soft text-foreground/80 text-[11px] font-semibold">
              {initial}
            </span>
            <LogOut className="h-3 w-3 text-muted-foreground" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 border-t border-border/50">
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid place-items-center h-8 w-8 rounded-full bg-gradient-to-br from-names-soft via-rewards-soft to-hospital-soft text-foreground/80 text-[13px] font-semibold ring-1 ring-border/40 flex-shrink-0">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">Signed in as</p>
          <p className="text-xs font-medium truncate" title={email}>
            {email}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5">
        <Link
          href="/names/couple"
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30",
            "py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Couple settings
        </Link>
        <Link
          href="/settings"
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30",
            "py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted/30",
              "py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
