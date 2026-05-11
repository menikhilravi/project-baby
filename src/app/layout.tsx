import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import { BottomNav } from "@/components/bottom-nav";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

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
};

async function getUserEmail(): Promise<string | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const email = await getUserEmail();
  const authed = Boolean(email);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased dark`}
    >
      <body className="min-h-full text-foreground">
        {authed ? <SideNav userEmail={email} /> : null}
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
        {authed ? <BottomNav /> : null}
      </body>
    </html>
  );
}
