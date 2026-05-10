"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function asNumber(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? ""));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid price");
  return Math.round(n * 100) / 100;
}

export async function addGearItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const retailer = String(formData.get("retailer") ?? "").trim() || null;
  const url = String(formData.get("url") ?? "").trim() || null;
  const emoji = String(formData.get("emoji") ?? "").trim() || "🛒";
  const current_price = asNumber(formData.get("current_price"));
  const target_price = asNumber(formData.get("target_price"));

  const { error } = await supabase.from("gear_items").insert({
    user_id: user.id,
    name,
    retailer,
    url,
    emoji,
    current_price,
    target_price,
    high_price: current_price,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/gear");
}

export async function updateGearPrice(formData: FormData) {
  const { supabase, user } = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  const newPrice = asNumber(formData.get("current_price"));

  // Read current high to bump if needed (RLS guarantees this is the user's own row).
  const { data: existing, error: readErr } = await supabase
    .from("gear_items")
    .select("high_price")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (readErr) throw new Error(readErr.message);

  const newHigh = Math.max(Number(existing?.high_price ?? 0), newPrice);

  const { error } = await supabase
    .from("gear_items")
    .update({ current_price: newPrice, high_price: newHigh })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/gear");
}

export async function deleteGearItem(formData: FormData) {
  const { supabase, user } = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const { error } = await supabase
    .from("gear_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/gear");
}
