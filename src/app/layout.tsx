import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fredoka, Geist_Mono, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-shell/app-header";
import { NavProgressProvider } from "@/components/nav-progress";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { BabyProvider, type BabyInfo } from "@/components/providers/baby-context";
import { BabyLiveProvider } from "@/components/live/baby-live-provider";
import { QuickLogSheetProvider } from "@/components/quick-log/quick-log-sheet";
import { CelebrateProvider } from "@/components/celebrate/celebrate-provider";
import { ToastProvider } from "@/components/ui/toast";
import { TimeZoneProvider } from "@/components/providers/time-zone";
import { TZ_COOKIE, isTimeZone } from "@/lib/time-format";
import { createClient } from "@/lib/supabase/server";
import { derivePhase, type Phase } from "@/lib/phase";
import {
  THEME_COLORS,
  THEME_COOKIE,
  parseThemePref,
  resolveAccent,
  type ThemePref,
} from "@/lib/theme";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function themePref(): Promise<ThemePref> {
  return parseThemePref((await cookies()).get(THEME_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const pref = await themePref();
  return {
    title: "Parent Prep Hub",
    description: "Your gentle, all-in-one companion for the road to parenthood.",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Baby 2026",
      // iOS reads this once at launch. Translucent (light text) only suits
      // the night palette; the header pads for the safe area either way.
      statusBarStyle: pref === "night" ? "black-translucent" : "default",
    },
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const pref = await themePref();
  return {
    viewportFit: "cover",
    themeColor:
      pref === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
            { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.night },
          ]
        : pref === "night"
          ? THEME_COLORS.night
          : THEME_COLORS.light,
  };
}

type UserContext = {
  email: string | null;
  userId: string | null;
  coupleId: string | null;
  hiddenSections: string[];
  phase: Phase;
  baby: BabyInfo;
};

const NO_BABY: BabyInfo = { name: null, birthDate: null, sex: null, accent: "neutral" };

async function getUserContext(): Promise<UserContext> {
  const anon: UserContext = {
    email: null,
    userId: null,
    coupleId: null,
    hiddenSections: [],
    phase: "prenatal",
    baby: NO_BABY,
  };
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return anon;
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  if (!user) return anon;

  // Single profile read covers the nav (hidden_sections), the phase and the
  // baby identity. If the 0034 columns are missing (code deployed before the
  // migration) retry without them so the nav never silently degrades.
  const full = await supabase
    .from("profiles")
    .select("hidden_sections, birth_date, phase_override, couple_id, baby_sex, baby_name, baby_accent")
    .eq("id", user.sub)
    .maybeSingle();
  let profile: {
    hidden_sections: string[];
    birth_date: string | null;
    phase_override: Phase | null;
    couple_id: string | null;
    baby_sex: "male" | "female" | null;
    baby_name?: string | null;
    baby_accent?: string | null;
  } | null = full.data;
  if (full.error) {
    const legacy = await supabase
      .from("profiles")
      .select("hidden_sections, birth_date, phase_override, couple_id, baby_sex")
      .eq("id", user.sub)
      .maybeSingle();
    profile = legacy.data;
  }

  return {
    email: user.email ?? null,
    userId: user.sub,
    coupleId: profile?.couple_id ?? null,
    hiddenSections: profile?.hidden_sections ?? [],
    phase: derivePhase(profile),
    baby: {
      name: profile?.baby_name ?? null,
      birthDate: profile?.birth_date ?? null,
      sex: profile?.baby_sex ?? null,
      accent: resolveAccent(profile?.baby_sex, profile?.baby_accent),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ email, userId, coupleId, hiddenSections, phase, baby }, pref, cookieStore] = await Promise.all([
    getUserContext(),
    themePref(),
    cookies(),
  ]);
  const tzRaw = cookieStore.get(TZ_COOKIE)?.value;
  const timeZone = isTimeZone(tzRaw ? decodeURIComponent(tzRaw) : null) ? decodeURIComponent(tzRaw!) : undefined;
  const authed = Boolean(email && userId);

  const shell = (
    <NavProgressProvider>
      <SideNav userEmail={email} phase={phase} hiddenSections={hiddenSections} />
      <AppHeader email={email!} />
      <main className="min-h-screen pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pl-64 md:pt-0 md:pb-0">
        {children}
      </main>
      <BottomNav phase={phase} hiddenSections={hiddenSections} />
    </NavProgressProvider>
  );

  return (
    <html
      lang="en"
      data-theme={pref}
      data-accent={baby.accent}
      data-scroll-behavior="smooth"
      className={`${nunito.variable} ${fredoka.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-foreground">
        <ThemeProvider initialPref={pref}>
          <MotionProvider>
            <TimeZoneProvider timeZone={timeZone}>
            <BabyProvider value={baby}>
              <ToastProvider>
                <CelebrateProvider>
                  {authed ? (
                    phase === "postnatal" ? (
                      <BabyLiveProvider coupleId={coupleId} userId={userId!}>
                        <QuickLogSheetProvider>{shell}</QuickLogSheetProvider>
                      </BabyLiveProvider>
                    ) : (
                      shell
                    )
                  ) : (
                    <main className="min-h-screen">{children}</main>
                  )}
                </CelebrateProvider>
              </ToastProvider>
            </BabyProvider>
            </TimeZoneProvider>
          </MotionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
