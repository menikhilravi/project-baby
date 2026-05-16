import { BookOpen, Pin, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { tryEmbed } from "@/lib/embed";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ q?: string }>;

type NoteListItem = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  updated_at: string;
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = q?.trim() ?? "";
  let notes: NoteListItem[] = [];
  let isSmartSearch = false;

  if (trimmed) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("couple_id")
      .eq("id", user.id)
      .single();
    const coupleId = profile?.couple_id ?? null;

    // Embed the query (RETRIEVAL_QUERY task type), then call the hybrid
    // search RPC. If embedding fails (Gemini down / key missing), the RPC
    // still does trigram-only ranking — we just lose the semantic signal.
    const queryEmbedding = await tryEmbed(trimmed, "RETRIEVAL_QUERY");
    isSmartSearch = queryEmbedding !== null;

    const { data: results } = await supabase.rpc("search_notes", {
      p_query: trimmed,
      p_query_embedding: queryEmbedding,
      p_couple_id: coupleId,
      p_user_id: user.id,
      p_limit: 30,
    });
    notes = (results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      pinned: r.pinned,
      updated_at: r.updated_at,
    }));
  } else {
    const { data } = await supabase
      .from("notes")
      .select("id, title, body, pinned, updated_at")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    notes = data ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="notes"
        icon={BookOpen}
        eyebrow="Knowledge Base"
        title="Pediatrician, dosages, emergency."
        subtitle="A searchable stash of the info you need at 3am."
      />

      <div className="mb-4 flex items-center gap-2">
        <form action="/notes" method="get" className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Ask anything — by meaning, not exact words"
            className="pl-9 rounded-2xl"
          />
        </form>
        <Link
          href="/notes/new"
          className="grid place-items-center h-10 w-10 rounded-2xl bg-notes text-white shadow-sm hover:bg-notes/90 transition-colors shrink-0"
          aria-label="New note"
        >
          <Plus className="h-4.5 w-4.5" />
        </Link>
      </div>

      {trimmed && isSmartSearch ? (
        <p className="mb-3 -mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-notes" />
          Smart search · ranked by meaning + keywords
        </p>
      ) : null}

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {trimmed ? "No notes match that search." : "No notes yet."}
          </p>
          {!trimmed ? (
            <Link
              href="/notes/new"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-notes hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add the first note
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes/${note.id}`}
                className={cn(
                  "block rounded-2xl border bg-card px-4 py-3 transition-all",
                  "hover:border-notes/40 hover:shadow-sm hover:-translate-y-0.5",
                )}
              >
                <div className="flex items-start gap-2">
                  {note.pinned ? (
                    <Pin className="h-3.5 w-3.5 text-notes mt-1 shrink-0 fill-current" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm tracking-tight truncate">
                      {note.title}
                    </p>
                    {note.body ? (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {note.body}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 tabular-nums shrink-0 mt-1">
                    {formatRelative(note.updated_at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
