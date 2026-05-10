import { redirect } from "next/navigation";
import { Baby, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/gear");

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("Email and password are required")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(next);
}

type SearchParams = Promise<{
  next?: string;
  error?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-names-soft via-rewards-soft to-hospital-soft ring-1 ring-border/60 shadow-sm mb-4">
            <Baby className="h-7 w-7 text-foreground/80" />
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Parent Prep Hub
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to save your gear, names, and packing list.
          </p>
        </div>

        <form
          action={signIn}
          className="space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
        >
          <input
            type="hidden"
            name="next"
            value={typeof sp.next === "string" ? sp.next : "/gear"}
          />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl bg-background/60 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                minLength={6}
                className="h-11 rounded-xl bg-background/60 pl-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            Sign in
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          {sp.error ? (
            <p className="text-xs text-destructive">{sp.error}</p>
          ) : null}

          <p className="text-[11px] text-center text-muted-foreground">
            Two-account app. New users are added by the admin in Supabase.
          </p>
        </form>
      </div>
    </div>
  );
}
