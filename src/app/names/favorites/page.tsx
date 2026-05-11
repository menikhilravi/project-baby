import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { names } from "@/data/names";
import { unlikeName, reorderFavorite } from "../actions";

export default async function FavoritesPage() {
  const supabase = await createClient();

  const [{ data: liked }, { data: generated }] = await Promise.all([
    supabase
      .from("name_swipes")
      .select("name, rank")
      .eq("verdict", "like")
      .order("rank", { ascending: true }),
    supabase.from("generated_names").select("name, origin, meaning"),
  ]);

  const meta = new Map([
    ...names.map((n) => [n.name, n] as const),
    ...(generated ?? []).map(
      (g) => [g.name, { name: g.name, origin: g.origin, meaning: g.meaning }] as const,
    ),
  ]);

  const list = liked ?? [];

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
        subtitle="Drag names up or down to rank them. #1 is your top pick."
      />

      {list.length === 0 ? (
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
        <ul className="space-y-2">
          {list.map((row, i) => {
            const m = meta.get(row.name);
            const isFirst = i === 0;
            const isLast = i === list.length - 1;
            return (
              <li
                key={row.name}
                className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-3"
              >
                <span className="w-6 text-center text-xs font-mono font-semibold text-names tabular-nums select-none">
                  {i + 1}
                </span>

                <div className="flex flex-col gap-0.5">
                  <form
                    action={async () => {
                      "use server";
                      await reorderFavorite(row.name, "up");
                    }}
                  >
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={isFirst}
                      aria-label={`Move ${row.name} up`}
                      className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-20"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await reorderFavorite(row.name, "down");
                    }}
                  >
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={isLast}
                      aria-label={`Move ${row.name} down`}
                      className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-20"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-semibold leading-tight">
                    {row.name}
                  </p>
                  {m && (
                    <p className="text-xs text-muted-foreground truncate">
                      {m.origin} &middot; {m.meaning}
                    </p>
                  )}
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
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive shrink-0"
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
