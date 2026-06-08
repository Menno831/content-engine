"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface SettingsResult {
  error?: string;
  ok?: string;
}

export async function updateAgencyAction(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };
  if (profile && profile.role !== "owner" && profile.role !== "team") {
    return { error: "Alleen owner/team kan instellingen wijzigen." };
  }

  const brandName = String(formData.get("brand_name") ?? "").trim();
  const accent = String(formData.get("accent") ?? "").trim();
  if (!brandName) return { error: "Merknaam is verplicht." };
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return { error: "Accentkleur moet een hexcode zijn (bijv. #F97316)." };

  const { error } = await supabase
    .from("agencies")
    .update({ brand_name: brandName, accent })
    .eq("id", agency.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: "Opgeslagen." };
}
