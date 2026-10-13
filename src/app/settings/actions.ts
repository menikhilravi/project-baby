"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setCoupleBabyName, setCoupleBabySex } from "@/lib/baby-identity";
import { isAccent } from "@/lib/theme";
import {
  isMedSubtype,
  MED_UNITS,
  normalizeTimes,
  type MedScheduleRow,
} from "@/lib/med-schedule";

export async function updatePhase(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  const overrideRaw = String(formData.get("phase_override") ?? "").trim();
  const sexRaw = String(formData.get("baby_sex") ?? "").trim();
  const weightRaw = String(formData.get("birth_weight_g") ?? "").trim();
  const nameRaw = formData.get("baby_name");

  const birth_date = birthRaw === "" ? null : birthRaw;
  const phase_override =
    overrideRaw === "prenatal" || overrideRaw === "postnatal"
      ? overrideRaw
      : null;
  const baby_sex =
    sexRaw === "male" || sexRaw === "female" ? sexRaw : null;
  const parsedWeight = weightRaw === "" ? null : Number(weightRaw);
  const birth_weight_g =
    parsedWeight != null && Number.isFinite(parsedWeight) && parsedWeight > 0
      ? parsedWeight
      : null;

  const { data, error } = await supabase
    .from("profiles")
    .update({ birth_date, phase_override, baby_sex, birth_weight_g })
    .eq("id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "Profile row not updated — check that migration 0010 ran and that the profiles RLS update policy is active.",
    );
  }
  // Sex and name describe the shared baby, so they go to both partners.
  await setCoupleBabySex(supabase, user.id, baby_sex);
  if (nameRaw !== null) await setCoupleBabyName(supabase, String(nameRaw));

  revalidatePath("/", "layout");
}

/** Per-user accent override; null = follow the baby's sex. */
export async function setBabyAccent(accent: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const value = isAccent(accent) ? accent : null;
  const { error } = await supabase
    .from("profiles")
    .update({ baby_accent: value })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function setCareReminderPrefs(prefs: {
  feed: boolean;
  diaper: boolean;
  feedIntervalMin?: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const interval =
    prefs.feedIntervalMin != null &&
    Number.isFinite(prefs.feedIntervalMin) &&
    prefs.feedIntervalMin > 0
      ? Math.round(prefs.feedIntervalMin)
      : null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      feed_reminders: prefs.feed,
      diaper_reminders: prefs.diaper,
      feed_interval_min: interval,
    })
    .eq("id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Profile row not updated — check migration 0028 ran.");
  }

  revalidatePath("/settings");
}

export type MedScheduleInput = {
  /** Omit to create; supply to update in place. */
  id?: number;
  subtype: string;
  label?: string | null;
  /** Local 24h "HH:MM" times — normalized and de-duped before saving. */
  times: string[];
  amount?: number | null;
  unit?: string | null;
  active?: boolean;
};

/**
 * Create or update a scheduled medicine. Couple-scoped: a schedule added by
 * either parent reminds both. Times are stored as local wall-clock strings —
 * see `0032_med_schedules.sql` for why.
 */
export async function saveMedSchedule(
  input: MedScheduleInput,
): Promise<MedScheduleRow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!isMedSubtype(input.subtype)) throw new Error("Unknown medicine.");
  const times = normalizeTimes(input.times);
  if (times.length === 0) throw new Error("Add at least one time.");

  const amount =
    input.amount != null && Number.isFinite(input.amount) && input.amount > 0
      ? input.amount
      : null;
  const unit =
    amount != null && input.unit && (MED_UNITS as readonly string[]).includes(input.unit)
      ? input.unit
      : null;
  const label = input.label?.trim() ? input.label.trim().slice(0, 40) : null;

  const fields = {
    subtype: input.subtype,
    label,
    times,
    amount,
    unit,
    active: input.active ?? true,
  };
  const select = "id, subtype, label, times, amount, unit, active";

  const query = input.id
    ? supabase.from("med_schedules").update(fields).eq("id", input.id)
    : supabase.from("med_schedules").insert({
        ...fields,
        user_id: user.id,
        couple_id: await coupleIdOf(supabase, user.id),
      });

  const { data, error } = await query.select(select).single();
  if (error) throw new Error(scheduleError(error.message));

  revalidatePath("/settings");
  revalidatePath("/today");
  return data as MedScheduleRow;
}

export async function deleteMedSchedule(id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("med_schedules").delete().eq("id", id);
  if (error) throw new Error(scheduleError(error.message));

  revalidatePath("/settings");
  revalidatePath("/today");
}

async function coupleIdOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", userId)
    .single();
  return data?.couple_id ?? null;
}

/** The one failure worth naming: the migration isn't applied yet. */
function scheduleError(message: string): string {
  if (/med_schedules/i.test(message) && /exist|schema cache/i.test(message)) {
    return "Medicine schedules need migration 0032 applied to Supabase.";
  }
  return message;
}

export async function updateHiddenSections(hidden: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const cleaned = Array.from(new Set(hidden.map((s) => s.trim()).filter(Boolean)));

  const { data, error } = await supabase
    .from("profiles")
    .update({ hidden_sections: cleaned })
    .eq("id", user.id)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Profile row not updated.");
  }

  revalidatePath("/", "layout");
}
