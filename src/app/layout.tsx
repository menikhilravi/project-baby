import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import { BottomNav } from "@/components/bottom-nav";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";
import { getPhase } from "@/lib/phase";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Parent Prep Hub",
  description: "Your gentle, all-in-one companion for the road to parenthood.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Baby 2026",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14161f",
};

async function getUserContext(): Promise<{
  email: string | null;
  hiddenSections: string[];
}> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { email: null, hiddenSections: [] };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { email: null, hiddenSections: [] };
  const { data: profile } = await supabase
    .from("profiles")
    .select("hidden_sections")
    .eq("id", auth.user.id)
    .maybeSingle();
  return {
    email: auth.user.email ?? null,
    hiddenSections: profile?.hidden_sections ?? [],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { email, hiddenSections } = await getUserContext();
  const authed = Boolean(email);
  const phase = authed ? await getPhase() : "prenatal";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased dark`}
    >
      <body className="min-h-full text-foreground">
        {authed ? (
          <SideNav
            userEmail={email}
            phase={phase}
            hiddenSections={hiddenSections}
          />
        ) : null}
        {authed ? <UserMenu email={email!} variant="mobile" /> : null}
        <main
          className={
            authed
              ? "md:pl-60 pb-20 md:pb-0 pt-16 md:pt-0 min-h-screen"
              : "min-h-screen"
          }
        >
          {children}
        </main>
        {authed ? (
          <BottomNav phase={phase} hiddenSections={hiddenSections} />
        ) : null}
      </body>
    </html>
  );
}
