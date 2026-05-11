import Link from "next/link";
import { LogOut, Users } from "lucide-react";
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
      <div className="md:hidden fixed top-4 right-4 z-40 flex items-center gap-2">
        <Link
          href="/names/couple"
          aria-label="Couple settings"
          className="flex items-center justify-center h-9 w-9 rounded-full bg-card/85 backdrop-blur-md ring-1 ring-border/60 shadow-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <Users className="h-4 w-4" />
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label={`Sign out ${email}`}
            title={email}
            className={cn(
              "flex items-center gap-2 rounded-full bg-card/85 backdrop-blur-md ring-1 ring-border/60 shadow-sm",
              "pl-1 pr-3 py-1 text-xs font-medium hover:bg-card transition-all hover:shadow",
            )}
          >
            <span className="grid place-items-center h-7 w-7 rounded-full bg-gradient-to-br from-names-soft to-rewards-soft text-foreground/80 text-xs font-semibold">
              {initial}
            </span>
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-border/60">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-names-soft via-rewards-soft to-hospital-soft text-foreground/80 text-sm font-semibold ring-1 ring-border/60">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium truncate" title={email}>
            {email}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Link
          href="/names/couple"
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40",
            "py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Couple settings
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40",
              "py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors",
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
