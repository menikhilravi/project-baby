import Link from "next/link";
import { Heart, Users } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { NameDeck } from "./_components/name-deck";
import { AddCustomName } from "./_components/add-custom-name";

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

  // Only show Gemini-generated names, 20 at a time
  const generatedPool = (generated ?? []).filter((g) => !swiped.has(g.name));
  const pool = generatedPool.slice(0, 20);

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12 flex flex-col items-center">
      <div className="w-full">
        <PageHero
          tool="names"
          icon={Heart}
          eyebrow="Names"
          title="Find a name you love."
          subtitle="Swipe right to keep, left to skip. Your favorites pile up over time."
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

      <NameDeck pool={pool} />

      <div className="mt-6">
        <AddCustomName />
      </div>
    </div>
  );
}
