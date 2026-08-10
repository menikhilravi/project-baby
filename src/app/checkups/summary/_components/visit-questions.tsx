"use client";

import { useState, useTransition } from "react";
import { Check, HelpCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addVisitQuestion,
  removeVisitQuestion,
  setVisitQuestionAsked,
} from "../actions";
import { SectionCard } from "./summary-ui";

export type QuestionRow = {
  id: number;
  question: string;
  asked_at: string | null;
  created_at: string;
};

/**
 * The half of the visit that the app can't compute: the things you meant to
 * ask. Add them as they come up at 3am, tick them off in the exam room.
 */
export function VisitQuestions({ questions }: { questions: QuestionRow[] }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = questions.filter((q) => !q.asked_at);
  const asked = questions.filter((q) => q.asked_at);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      try {
        await addVisitQuestion(text);
        setDraft("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save that.");
      }
    });
  };

  return (
    <SectionCard
      icon={HelpCircle}
      accent="text-checkups"
      title="Questions for the doctor"
      headline={`${open.length} to ask`}
      sub={asked.length > 0 ? `${asked.length} already covered` : undefined}
    >
      <div className="print:hidden">
        <div className="flex gap-2">
          <Input
            placeholder="Is the flat spot on her head normal?"
            value={draft}
            maxLength={300}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="lg"
            onClick={submit}
            disabled={pending || draft.trim().length === 0}
            className="shrink-0"
          >
            <Plus /> Add
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      {questions.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          Nothing on the list yet. Anything you wonder about between now and the
          visit goes here — it&apos;s the part you always forget in the room.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border print:mt-0">
          {[...open, ...asked].map((q) => (
            <QuestionItem key={q.id} row={q} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function QuestionItem({ row }: { row: QuestionRow }) {
  const [asked, setAsked] = useState(Boolean(row.asked_at));
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !asked;
    setAsked(next);
    startTransition(async () => {
      try {
        await setVisitQuestionAsked(row.id, next);
      } catch {
        setAsked(!next);
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      try {
        await removeVisitQuestion(row.id);
      } catch (err) {
        console.error(err);
      }
    });

  return (
    <li className="group flex items-start gap-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={asked}
        aria-label={asked ? "Mark as still to ask" : "Mark as asked"}
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
          asked
            ? "border-checkups bg-checkups text-background"
            : "border-border text-transparent hover:bg-muted",
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <p
        className={cn(
          "flex-1 text-[15px] leading-snug",
          asked && "text-muted-foreground line-through",
        )}
      >
        {row.question}
      </p>
      <button
        type="button"
        onClick={remove}
        className="mt-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 print:hidden"
        aria-label="Delete question"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
