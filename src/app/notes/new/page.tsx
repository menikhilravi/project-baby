import { BookOpen } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNote } from "../actions";

export default function NewNotePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="notes"
        icon={BookOpen}
        eyebrow="New note"
        title="Jot it down."
      />

      <form action={createNote} className="space-y-4">
        <Input
          name="title"
          placeholder="Title (e.g. Pediatrician info)"
          required
          autoFocus
          className="rounded-2xl text-base"
        />
        <textarea
          name="body"
          placeholder="Paste in dosages, phone numbers, instructions…"
          rows={14}
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notes/40 resize-y"
        />
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/notes"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            className="rounded-2xl bg-notes hover:bg-notes/90 text-white"
          >
            Save note
          </Button>
        </div>
      </form>
    </div>
  );
}
