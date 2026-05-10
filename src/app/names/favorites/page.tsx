import Link from "next/link";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { names } from "@/data/names";
import { unlikeName } from "../actions";

export default async function FavoritesPage() {
  const supabase = await createClient();

  const { data: liked } = await supabase
    .from("name_swipes")
    .select("name, created_at")
    .eq("verdict", "like")
    .order("created_at", { ascending: false });

  const meta = new Map(names.map((n) => [n.name, n]));

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
        icon={Heart}
        eyebrow="Favorites"
        title="The shortlist."
        subtitle="Names you've kept. Remove one to put it back in the deck."
      />

      {!liked || liked.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border/60 p-10 text-center">
          <Heart className="h-7 w-7 mx-auto text-names" />
          <h3 className="font-display text-lg font-semibold mt-3">
            No favorites yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on names you love.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {liked.map((row) => {
            const m = meta.get(row.name);
            return (
              <li
                key={row.name}
                className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-semibold leading-tight">
                    {row.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m
                      ? `${m.origin} · ${m.meaning}`
                      : "Saved"}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await unlikeName(row.name);
                  }}
                >
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${row.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
