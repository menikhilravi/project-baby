"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { defaultChecklist, type Owner } from "@/data/default-checklist";

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

  // Couple-aware check: if the couple already has any items, don't re-seed.
  const { count } = await supabase
    .from("hospital_checklist")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) return;

  const coupleId = await getUserCoupleId(supabase, user.id);

  const rows = (Object.entries(defaultChecklist) as [Owner, string[]][]).flatMap(
    ([owner, items]) =>
      items.map((item, idx) => ({
        user_id: user.id,
        couple_id: coupleId,
        owner,
        item,
        sort_order: idx,
      })),
  );

  const { error } = await supabase.from("hospital_checklist").insert(rows);
  if (error) throw new Error(error.message);
}

export async function toggleItem(id: number, checked: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("hospital_checklist")
    .update({ checked })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hospital");
}

export async function addCustomItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const owner = String(formData.get("owner") ?? "") as Owner;
  const item = String(formData.get("item") ?? "").trim();
  if (!item) return;
  if (!["mom", "dad", "baby"].includes(owner)) {
    throw new Error("Invalid owner");
  }

  const coupleId = await getUserCoupleId(supabase, user.id);

  const { data: lastRow } = await supabase
    .from("hospital_checklist")
    .select("sort_order")
    .eq("owner", owner)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("hospital_checklist").insert({
    user_id: user.id,
    couple_id: coupleId,
    owner,
    item,
    sort_order: nextOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/hospital");
}

export async function removeItem(id: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("hospital_checklist")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hospital");
}
