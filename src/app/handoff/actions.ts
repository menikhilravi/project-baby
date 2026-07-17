"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Contact = { label: string; phone: string };

export type HandoffInfo = {
  careInstructions: string;
  pediatricianName: string;
  pediatricianPhone: string;
  emergencyContacts: Contact[];
};

/** Save the static handoff info onto the current user's profile. */
export async function saveHandoffInfo(info: HandoffInfo) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const contacts = info.emergencyContacts
    .map((c) => ({ label: c.label.trim(), phone: c.phone.trim() }))
    .filter((c) => c.label && c.phone);

  const { error } = await supabase
    .from("profiles")
    .update({
      care_instructions: info.careInstructions.trim() || null,
      pediatrician_name: info.pediatricianName.trim() || null,
      pediatrician_phone: info.pediatricianPhone.trim() || null,
      emergency_contacts: contacts,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/handoff");
}
