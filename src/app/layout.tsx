import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import { BottomNav } from "@/components/bottom-nav";
import { UserMenu } from "@/components/user-menu";
import { NavProgressProvider } from "@/components/nav-progress";
import { createClient } from "@/lib/supabase/server";
import { derivePhase, type Phase } from "@/lib/phase";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  phase: Phase;
}> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { email: null, hiddenSections: [], phase: "prenatal" };
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  if (!user) return { email: null, hiddenSections: [], phase: "prenatal" };
  // Single profile read covers both the nav (hidden_sections) and the
  // prenatal/postnatal phase, avoiding a second auth + profile round-trip.
  const { data: profile } = await supabase
    .from("profiles")
    .select("hidden_sections, birth_date, phase_override")
    .eq("id", user.sub)
    .maybeSingle();
  return {
    email: user.email ?? null,
    hiddenSections: profile?.hidden_sections ?? [],
    phase: derivePhase(profile),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { email, hiddenSections, phase } = await getUserContext();
  const authed = Boolean(email);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full text-foreground">
        {authed ? (
          <NavProgressProvider>
            <SideNav
              userEmail={email}
              phase={phase}
              hiddenSections={hiddenSections}
            />
            <UserMenu email={email!} variant="mobile" />
            <main className="md:pl-60 pb-20 md:pb-0 pt-16 md:pt-0 min-h-screen">
              {children}
            </main>
            <BottomNav phase={phase} hiddenSections={hiddenSections} />
          </NavProgressProvider>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
        <Analytics />
      </body>
    </html>
  );
}
