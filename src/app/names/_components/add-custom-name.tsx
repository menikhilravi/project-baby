"use client";

import { useRef, useState, useTransition } from "react";
import { PlusCircle, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCustomName } from "../actions";

export function AddCustomName() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) return;
    startTransition(async () => {
      await addCustomName(formData);
      formRef.current?.reset();
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 1400);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Add your own name
      </button>
    );
  }

  return (
    <div className="w-full max-w-xs rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground/80">Add a name to your deck</p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-2">
        <input
          name="name"
          required
          autoFocus
          placeholder="Name"
          autoComplete="off"
          className={cn(
            "w-full text-sm px-3 py-2 rounded-xl border border-border/50 bg-background/50",
            "text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-1 focus:ring-names/50",
          )}
        />
        <input
          name="meaning"
          placeholder="Meaning (optional)"
          autoComplete="off"
          className={cn(
            "w-full text-sm px-3 py-2 rounded-xl border border-border/50 bg-background/50",
            "text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-1 focus:ring-names/50",
          )}
        />
        <button
          type="submit"
          disabled={pending || done}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-all",
            done
              ? "bg-hospital-soft text-hospital"
              : "bg-names text-white hover:bg-names/90 active:scale-[0.98]",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : done ? (
            <>
              <Check className="h-4 w-4" />
              Added to deck
            </>
          ) : (
            "Add to deck"
          )}
        </button>
      </form>
    </div>
  );
}
