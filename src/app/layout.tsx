import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/side-nav";
import { BottomNav } from "@/components/bottom-nav";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full text-foreground">
        <SideNav />
        <main className="md:pl-64 pb-24 md:pb-12 min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
