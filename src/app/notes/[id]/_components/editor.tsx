"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { deleteNote, updateNote } from "../../actions";

type Note = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  updated_at: string;
};

export function NoteEditor({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [pinned, setPinned] = useState(note.pinned);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = title !== note.title || body !== note.body;

  const handleSave = () => {
    if (!dirty) return;
    startTransition(async () => {
      try {
        await updateNote(note.id, { title, body });
        setSavedAt(Date.now());
      } catch (err) {
        console.error(err);
      }
    });
  };

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      try {
        await updateNote(note.id, { pinned: next });
      } catch (err) {
        setPinned(!next);
        console.error(err);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => {
      try {
        await deleteNote(note.id);
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          className="rounded-2xl text-base font-medium flex-1"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={togglePin}
          className={cn(
            "h-10 w-10 rounded-2xl",
            pinned ? "text-notes" : "text-muted-foreground",
          )}
          aria-label={pinned ? "Unpin" : "Pin"}
        >
          {pinned ? (
            <Pin className="h-4 w-4 fill-current" />
          ) : (
            <PinOff className="h-4 w-4" />
          )}
        </Button>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={handleSave}
        rows={16}
        className="w-full rounded-2xl border bg-card px-4 py-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notes/40 resize-y"
      />

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          className="text-muted-foreground hover:text-destructive rounded-xl"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {pending
              ? "Saving…"
              : dirty
                ? "Unsaved"
                : savedAt
                  ? "Saved"
                  : "Up to date"}
          </span>
          <Link
            href="/notes"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
