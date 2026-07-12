"use client";

import { useState, useTransition } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMilestone, removeMilestone } from "../growth-actions";

export type MilestoneRow = {
  id: number;
  notes: string | null;
  occurred_at: string;
};

/** A lightweight keepsake list of "firsts" — first smile, rolled over, … */
export function MilestonesCard({ milestones }: { milestones: MilestoneRow[] }) {
  const [showForm, setShowForm] = useState(false);
  const rows = [...milestones].sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-reports" /> Milestones
        </CardTitle>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "outline"}
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm ? <AddForm onDone={() => setShowForm(false)} /> : null}

        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No milestones yet. Capture the first smile, first roll, first
            bath…
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((m) => (
              <MilestoneRowItem key={m.id} row={m} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneRowItem({ row }: { row: MilestoneRow }) {
  const [pending, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      try {
        await removeMilestone(row.id);
      } catch (err) {
        console.error(err);
      }
    });

  return (
    <li className="group flex items-center gap-3 py-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-reports-soft text-reports ring-1 ring-border shrink-0">
        <Star className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">{row.notes}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {fmtDate(row.occurred_at)}
        </p>
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Delete milestone"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!label.trim()) {
      setError("Add a short description.");
      return;
    }
    startTransition(async () => {
      try {
        await addMilestone(label, date);
        setLabel("");
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <Input
        placeholder="First smile"
        value={label}
        maxLength={80}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Input
        type="date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value)}
        className="max-w-xs"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
