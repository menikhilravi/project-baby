"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveHandoffInfo, type Contact } from "../actions";

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-handoff";

export function HandoffEditor(props: {
  careInstructions: string;
  pediatricianName: string;
  pediatricianPhone: string;
  emergencyContacts: Contact[];
}) {
  const [open, setOpen] = useState(false);
  const [careInstructions, setCare] = useState(props.careInstructions);
  const [pediatricianName, setPedName] = useState(props.pediatricianName);
  const [pediatricianPhone, setPedPhone] = useState(props.pediatricianPhone);
  const [contacts, setContacts] = useState<Contact[]>(
    props.emergencyContacts.length
      ? props.emergencyContacts
      : [{ label: "", phone: "" }],
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateContact(i: number, patch: Partial<Contact>) {
    setContacts((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await saveHandoffInfo({
          careInstructions,
          pediatricianName,
          pediatricianPhone,
          emergencyContacts: contacts,
        });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit sitter info
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card/50 p-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Care notes (feeding, sleep, quirks…)
        </label>
        <textarea
          value={careInstructions}
          onChange={(e) => setCare(e.target.value)}
          rows={4}
          placeholder="e.g. Bottle every 3h, 4oz. Loves the swaddle. White noise for naps."
          className={cn(inputClass, "resize-y")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Pediatrician
          </label>
          <input
            value={pediatricianName}
            onChange={(e) => setPedName(e.target.value)}
            placeholder="Dr. Rivera"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Pediatrician phone
          </label>
          <input
            value={pediatricianPhone}
            onChange={(e) => setPedPhone(e.target.value)}
            inputMode="tel"
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Emergency contacts
        </label>
        <div className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => updateContact(i, { label: e.target.value })}
                placeholder="Name"
                className={cn(inputClass, "flex-1")}
              />
              <input
                value={c.phone}
                onChange={(e) => updateContact(i, { phone: e.target.value })}
                inputMode="tel"
                placeholder="Phone"
                className={cn(inputClass, "flex-1")}
              />
              <button
                type="button"
                onClick={() =>
                  setContacts((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Remove contact"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setContacts((prev) => [...prev, { label: "", phone: "" }])
          }
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-handoff hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add contact
        </button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
