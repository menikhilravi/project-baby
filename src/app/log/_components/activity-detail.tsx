"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { KIND_META, type EventKind } from "@/lib/kind-meta";
import { removeEvent } from "../actions";
import { Timeline, type BabyEventRow, type RoleMap } from "./timeline";
import { EventEditor } from "./event-editor";

type Props = {
  kind: EventKind;
  initialEvents: BabyEventRow[];
  currentUserId: string;
  coupleId: string | null;
  roleMap: RoleMap;
};

/** Sort newest-first by occurred_at so back-dated adds land in the right spot. */
function sortEvents(rows: BabyEventRow[]): BabyEventRow[] {
  return [...rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

export function ActivityDetail({
  kind,
  initialEvents,
  currentUserId,
  coupleId,
  roleMap,
}: Props) {
  const meta = KIND_META[kind];
  const [events, setEvents] = useState<BabyEventRow[]>(() =>
    sortEvents(initialEvents),
  );
  const [editing, setEditing] = useState<BabyEventRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const upsert = (row: BabyEventRow) =>
    setEvents((prev) => {
      const next = prev.some((e) => e.id === row.id)
        ? prev.map((e) => (e.id === row.id ? row : e))
        : [row, ...prev];
      return sortEvents(next);
    });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`activity_${kind}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "baby_events",
          ...(coupleId ? { filter: `couple_id=eq.${coupleId}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: number };
            setEvents((prev) => prev.filter((e) => e.id !== old.id));
            return;
          }
          const row = payload.new as BabyEventRow;
          if (row.kind !== kind) return;
          upsert(row);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, kind]);

  const handleRemove = (id: number) => {
    const snapshot = events;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => {
      try {
        await removeEvent(id);
      } catch (err) {
        console.error(err);
        setEvents(snapshot);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          className="rounded-full"
        >
          <Plus className="h-4 w-4" /> Add {meta.label.toLowerCase()}
        </Button>
      </div>

      <Timeline
        events={events}
        currentUserId={currentUserId}
        roleMap={roleMap}
        onEdit={setEditing}
        onRemove={handleRemove}
        emptyLabel={`No ${meta.plural.toLowerCase()} logged yet. Tap “Add ${meta.label.toLowerCase()}” to record one — even for a past time.`}
      />

      {adding ? (
        <EventEditor
          kind={kind}
          onClose={() => setAdding(false)}
          onSaved={upsert}
        />
      ) : null}
      {editing ? (
        <EventEditor
          kind={kind}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={upsert}
        />
      ) : null}
    </div>
  );
}
