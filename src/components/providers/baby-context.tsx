"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Accent, BabySex } from "@/lib/theme";

export type BabyInfo = {
  name: string | null;
  birthDate: string | null;
  sex: BabySex | null;
  accent: Accent;
};

const EMPTY: BabyInfo = { name: null, birthDate: null, sex: null, accent: "neutral" };

const BabyContext = createContext<BabyInfo>(EMPTY);

/** Who the baby is — so the mascot, header and greetings anywhere can use it. */
export function BabyProvider({ value, children }: { value: BabyInfo; children: ReactNode }) {
  return <BabyContext.Provider value={value}>{children}</BabyContext.Provider>;
}

export function useBaby(): BabyInfo {
  return useContext(BabyContext);
}
