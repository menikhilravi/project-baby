"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { defaultNurseryChecklist, type NurseryOwner } from "@/data/default-nursery-checklist";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

async function getUserCoupleId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", userId)
    .single();
  return data?.couple_id ?? null;
}

export async function seedDefaultList() {
  const { supabase, user } = await requireUser();

  const { count } = await supabase
    .from("nursery_checklist")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) return;

  const coupleId = await getUserCoupleId(supabase, user.id);

  const rows = (Object.entries(defaultNurseryChecklist) as [NurseryOwner, string[]][]).flatMap(
    ([owner, items]) =>
      items.map((item, idx) => ({
        user_id: user.id,
        couple_id: coupleId,
        owner,
        item,
        sort_order: idx,
      })),
  );

  const { error } = await supabase.from("nursery_checklist").insert(rows);
  if (error) throw new Error(error.message);
}

export async function toggleItem(id: number, checked: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("nursery_checklist")
    .update({ checked })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nursery");
}

export async function addCustomItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const owner = String(formData.get("owner") ?? "") as NurseryOwner;
  const item = String(formData.get("item") ?? "").trim();
  if (!item) return;
  if (!["room", "safety", "supplies"].includes(owner)) {
    throw new Error("Invalid owner");
  }

  const coupleId = await getUserCoupleId(supabase, user.id);

  const { data: lastRow } = await supabase
    .from("nursery_checklist")
    .select("sort_order")
    .eq("owner", owner)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("nursery_checklist").insert({
    user_id: user.id,
    couple_id: coupleId,
    owner,
    item,
    sort_order: nextOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/nursery");
}

export async function removeItem(id: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("nursery_checklist")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nursery");
}

/**
 * Create (or reuse) a shortlist gear item for a nursery row. The shortlist
 * UI is rendered inline on the nursery page, so this just ensures the
 * gear_item exists and lets the page re-render with the new shortlist
 * section visible. Idempotent.
 */
export async function createShortlistFromNursery(formData: FormData) {
  const { supabase, user } = await requireUser();

  const nurseryId = parseInt(String(formData.get("nursery_item_id") ?? ""), 10);
  if (!Number.isFinite(nurseryId)) throw new Error("Missing nursery_item_id");

  // Auth via RLS: select returns the row only if the user can see it.
  const { data: nurseryRow } = await supabase
    .from("nursery_checklist")
    .select("id, item")
    .eq("id", nurseryId)
    .maybeSingle();
  if (!nurseryRow) throw new Error("Nursery item not found");

  const { data: existing } = await supabase
    .from("gear_items")
    .select("id")
    .eq("nursery_item_id", nurseryId)
    .maybeSingle();

  if (!existing) {
    const coupleId = await getUserCoupleId(supabase, user.id);
    const { error } = await supabase.from("gear_items").insert({
      user_id: user.id,
      couple_id: coupleId,
      name: nurseryRow.item,
      kind: "shortlist",
      nursery_item_id: nurseryId,
      target_price: null,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/nursery");
  revalidatePath("/gear");
}
