import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Heart, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { names } from "@/data/names";
import { unlikeName, reorderFavorite } from "../actions";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: liked }, { data: generated }, { data: myProfile }] =
    await Promise.all([
      supabase
        .from("name_swipes")
        .select("name, rank")
        .eq("verdict", "like")
        .order("rank", { ascending: true }),
      supabase.from("generated_names").select("name, origin, meaning"),
      supabase
        .from("profiles")
        .select("couple_id")
        .eq("id", user!.id)
        .single(),
    ]);

  const meta = new Map([
    ...names.map((n) => [n.name, n] as const),
    ...(generated ?? []).map(
      (g) =>
        [g.name, { name: g.name, origin: g.origin, meaning: g.meaning }] as const,
    ),
  ]);

  // Fetch partner likes if in a couple
  let partnerLiked = new Set<string>();
  let inCouple = false;

  if (myProfile?.couple_id) {
    inCouple = true;
    const admin = createServiceClient();
    const { data: partnerProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("couple_id", myProfile.couple_id)
      .neq("id", user!.id)
      .maybeSingle();

    if (partnerProfile) {
      const { data: partnerSwipes } = await admin
        .from("name_swipes")
        .select("name")
        .eq("user_id", partnerProfile.id)
        .eq("verdict", "like");
      partnerLiked = new Set((partnerSwipes ?? []).map((s) => s.name));
    }
  }

  const list = liked ?? [];
  const bothLoved = list.filter((r) => partnerLiked.has(r.name));
  const onlyMe = list.filter((r) => !partnerLiked.has(r.name));

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/names"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to deck
        </Link>
        <Link
          href="/names/couple"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Users className="h-3.5 w-3.5" />
          {inCouple ? "Couple connected" : "Link partner"}
        </Link>
      </div>

      <PageHero
        tool="names"
        icon={Heart}
        eyebrow="Favorites"
        title="The shortlist."
        subtitle={
          inCouple
            ? "Names you both love are highlighted at the top."
            : "Rank names up or down. Link your partner to see matches."
        }
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
        <div className="space-y-6">
          {inCouple && bothLoved.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-names mb-2 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 fill-current" />
                You both love ({bothLoved.length})
              </h2>
              <ul className="space-y-2">
                {bothLoved.map((row, i) => (
                  <NameRow
                    key={row.name}
                    row={row}
                    i={i}
                    total={bothLoved.length}
                    meta={meta}
                    highlight
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            {inCouple && bothLoved.length > 0 && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Your picks ({onlyMe.length})
              </h2>
            )}
            {onlyMe.length === 0 && bothLoved.length > 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All your favorites are shared picks!
              </p>
            ) : (
              <ul className="space-y-2">
                {(inCouple ? onlyMe : list).map((row, i) => (
                  <NameRow
                    key={row.name}
                    row={row}
                    i={i}
                    total={(inCouple ? onlyMe : list).length}
                    meta={meta}
                    highlight={false}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function NameRow({
  row,
  i,
  total,
  meta,
  highlight,
}: {
  row: { name: string; rank: number | null };
  i: number;
  total: number;
  meta: Map<string, { name: string; origin: string; meaning: string }>;
  highlight: boolean;
}) {
  const m = meta.get(row.name);
  const isFirst = i === 0;
  const isLast = i === total - 1;

  return (
    <li
      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 ${
        highlight ? "bg-names-soft border-names/20" : "bg-card"
      }`}
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

      {highlight && (
        <Heart className="h-4 w-4 text-names fill-current shrink-0" />
      )}

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
}
