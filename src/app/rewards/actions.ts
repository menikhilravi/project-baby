"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeCategory } from "@/lib/category-map";

export type RewardMatch = {
  cardId: string;
  cardName: string;
  multiplier: number;
  pointValueCents: number;
  points: number;
  dollarValue: number;
};

export type FindBestCardResult =
  | {
      ok: true;
      category: string;
      spend: number;
      best: RewardMatch;
      runnersUp: RewardMatch[];
    }
  | {
      ok: false;
      error: "missing_input" | "unknown_category" | "no_matches" | "db_error";
      message: string;
    };

export async function findBestCard(
  _prev: FindBestCardResult | null,
  formData: FormData,
): Promise<FindBestCardResult> {
  const rawCategory = String(formData.get("category") ?? "").trim();
  const spendRaw = String(formData.get("spend") ?? "").trim();
  const spend = parseFloat(spendRaw);

  if (!rawCategory || !Number.isFinite(spend) || spend <= 0) {
    return {
      ok: false,
      error: "missing_input",
      message: "Enter a category and a spend amount.",
    };
  }

  const category = normalizeCategory(rawCategory);
  if (!category) {
    return {
      ok: false,
      error: "unknown_category",
      message: `We don't recognize "${rawCategory}" yet. Try: dining, groceries, gas, travel, streaming, amazon, drugstores, or transit.`,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("card_categories")
    .select("multiplier, card_id, cards!inner(id, name, point_value_cents)")
    .eq("category", category);

  if (error) {
    return {
      ok: false,
      error: "db_error",
      message: error.message,
    };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "no_matches",
      message: `No cards in our list earn extra on ${category} yet.`,
    };
  }

  type Row = {
    multiplier: number;
    card_id: string;
    cards: {
      id: string;
      name: string;
      point_value_cents: number;
    };
  };

  const matches: RewardMatch[] = (data as unknown as Row[])
    .map((row) => {
      const points = spend * Number(row.multiplier);
      const dollarValue = (points * Number(row.cards.point_value_cents)) / 100;
      return {
        cardId: row.cards.id,
        cardName: row.cards.name,
        multiplier: Number(row.multiplier),
        pointValueCents: Number(row.cards.point_value_cents),
        points,
        dollarValue,
      };
    })
    .sort((a, b) => {
      if (b.dollarValue !== a.dollarValue) return b.dollarValue - a.dollarValue;
      if (b.multiplier !== a.multiplier) return b.multiplier - a.multiplier;
      return a.cardId.localeCompare(b.cardId);
    });

  return {
    ok: true,
    category,
    spend,
    best: matches[0],
    runnersUp: matches.slice(1, 3),
  };
}
