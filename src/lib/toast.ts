"use client";

import { Toast } from "@base-ui/react/toast";
import type { EventKind } from "@/lib/kind-meta";

export type ToastData = {
  kind?: EventKind;
  /** Undo handler — renders an Undo button when present. */
  undo?: () => void | Promise<unknown>;
};

/**
 * App-wide toast manager. Lives outside React so any callback (including the
 * quick-log hook after an await) can raise a toast; <Toaster> renders them.
 */
export const toastManager = Toast.createToastManager<ToastData>();

export const toast = {
  /** "Bottle · 4 oz logged" with an optional Undo. */
  log(title: string, opts: { kind?: EventKind; undo?: ToastData["undo"]; description?: string } = {}) {
    return toastManager.add({
      title,
      description: opts.description,
      type: "log",
      timeout: opts.undo ? 6000 : 3500,
      data: { kind: opts.kind, undo: opts.undo },
    });
  },
  success(title: string, description?: string) {
    return toastManager.add({ title, description, type: "success", timeout: 3500 });
  },
  error(title: string, description?: string) {
    return toastManager.add({
      title,
      description,
      type: "error",
      priority: "high",
      timeout: 6000,
    });
  },
  close(id?: string) {
    toastManager.close(id);
  },
};
