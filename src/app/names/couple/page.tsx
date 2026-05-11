import Link from "next/link";
import { ArrowLeft, Heart, Users, Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHero } from "@/components/page-hero";
import { getCoupleStatus, createCouple, joinCouple } from "../actions";

type SearchParams = Promise<{ error?: string }>;

export default async function CouplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const status = await getCoupleStatus();

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12">
      <Link
        href="/names"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to deck
      </Link>

      <PageHero
        tool="names"
        icon={Users}
        eyebrow="Couple mode"
        title="Swipe together."
        subtitle="Link accounts so you can see which names you both love."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {decodeURIComponent(error)}
        </div>
      )}

      {!status ? (
        <NotConnected />
      ) : status.partnerId ? (
        <Connected partnerEmail={status.partnerEmail} />
      ) : (
        <WaitingForPartner inviteCode={status.inviteCode} />
      )}
    </div>
  );
}

function NotConnected() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-names" />
          Start a couple
        </h2>
        <p className="text-sm text-muted-foreground">
          Create a couple and share your invite code with your partner.
        </p>
        <form action={createCouple}>
          <Button type="submit" className="w-full bg-names hover:bg-names/90 text-white">
            Create couple
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Join with a code
        </h2>
        <p className="text-sm text-muted-foreground">
          Your partner already created a couple? Enter their 6-character code.
        </p>
        <form action={joinCouple} className="flex gap-2">
          <Input
            name="code"
            placeholder="ABCD12"
            maxLength={6}
            className="uppercase font-mono tracking-widest"
            required
          />
          <Button type="submit" variant="outline" className="shrink-0">
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}

function WaitingForPartner({ inviteCode }: { inviteCode: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center space-y-4">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-names-soft mx-auto">
        <Users className="h-5 w-5 text-names" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Your invite code</p>
        <p className="font-mono text-4xl font-bold tracking-[0.2em] text-foreground mt-1">
          {inviteCode}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Share this code with your partner. Once they join, you&apos;ll both see
        your matches on the Favorites page.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        Waiting for partner to join…
      </div>
    </div>
  );
}

function Connected({ partnerEmail }: { partnerEmail: string | null }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-names-soft mx-auto">
        <Heart className="h-5 w-5 text-names fill-current" />
      </div>
      <div>
        <p className="font-semibold text-lg">Connected</p>
        {partnerEmail && (
          <p className="text-sm text-muted-foreground mt-0.5">{partnerEmail}</p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Head to{" "}
        <Link href="/names/favorites" className="text-names hover:underline">
          Favorites
        </Link>{" "}
        to see the names you both love.
      </p>
    </div>
  );
}
