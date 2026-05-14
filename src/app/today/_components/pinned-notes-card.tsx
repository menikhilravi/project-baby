import Link from "next/link";
import { Pin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PinnedNote = {
  id: number;
  title: string;
  preview: string;
};

export function PinnedNotesCard({ notes }: { notes: PinnedNote[] }) {
  return (
    <section>
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Pin className="h-3 w-3 fill-current text-notes" />
          Pinned
        </h3>
        <Link
          href="/notes"
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          All notes <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {notes.map((note) => (
          <li key={note.id}>
            <Link
              href={`/notes/${note.id}`}
              className={cn(
                "block rounded-2xl border bg-card px-3.5 py-3 transition-all h-full",
                "hover:border-notes/40 hover:shadow-sm hover:-translate-y-0.5",
              )}
            >
              <p className="font-medium text-sm tracking-tight truncate">
                {note.title}
              </p>
              {note.preview ? (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {note.preview}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
