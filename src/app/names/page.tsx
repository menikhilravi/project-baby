import Link from "next/link";
import { Heart, Users } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { names } from "@/data/names";
import { NameDeck } from "./_components/name-deck";

export default async function NamesPage() {
  const supabase = await createClient();

  const [{ data: swipes }, { data: generated }] = await Promise.all([
    supabase.from("name_swipes").select("name, verdict"),
    supabase
      .from("generated_names")
      .select("name, origin, meaning")
      .order("created_at"),
  ]);

  const swiped = new Set((swipes ?? []).map((s) => s.name));
  const likedCount = (swipes ?? []).filter((s) => s.verdict === "like").length;

  const staticPool = names.filter((n) => !swiped.has(n.name));
  const generatedPool = (generated ?? []).filter((g) => !swiped.has(g.name));
  const pool = [...staticPool, ...generatedPool];
  const totalSeen = swiped.size;
  const totalKnown = names.length + (generated ?? []).length;

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12 flex flex-col items-center">
      <div className="w-full">
        <PageHero
          tool="names"
          icon={Heart}
          eyebrow="Name Bracket"
          title="Find a name you love."
          subtitle="Tap to keep, tap to skip. Your favorites pile up over time."
        />

        <div className="-mt-3 mb-2 flex items-center justify-end gap-2">
          <Link
            href="/names/couple"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            Couple
          </Link>
          <Link
            href="/names/favorites"
            className="inline-flex items-center gap-1.5 rounded-full bg-names-soft text-names px-3 py-1 text-xs font-medium hover:bg-names/15 transition-colors"
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
            Favorites ({likedCount})
          </Link>
        </div>
      </div>

      <NameDeck
        pool={pool}
        seenCount={totalSeen}
        totalCount={totalKnown}
      />
    </div>
  );
}
