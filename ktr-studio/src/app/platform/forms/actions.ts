"use server";

// Leadformulieren: je maakt er één per klant/aanbod, deelt de publieke
// link, en elke inzending landt als lead bij die klant.

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface FormResult {
  ok?: boolean;
  error?: string;
  token?: string;
}

export async function createFormAction(input: {
  name: string;
  clientId: string | null;
  headline: string;
  intro: string;
  buttonLabel: string;
  askPhone: boolean;
  askInstagram: boolean;
}): Promise<FormResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (!input.name.trim()) return { error: "Geef het formulier een naam." };

  const token = randomBytes(9).toString("base64url");
  const { error } = await supabase.from("lead_forms").insert({
    agency_id: agency.id,
    client_id: input.clientId,
    name: input.name.trim(),
    token,
    headline: input.headline.trim() || input.name.trim(),
    intro: input.intro.trim() || null,
    button_label: input.buttonLabel.trim() || "Versturen",
    ask_phone: input.askPhone,
    ask_instagram: input.askInstagram,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/forms");
  return { ok: true, token };
}

export async function toggleFormAction(id: string, active: boolean): Promise<FormResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("lead_forms").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/forms");
  return { ok: true };
}

export async function deleteFormAction(id: string): Promise<FormResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("lead_forms").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/forms");
  return { ok: true };
}
