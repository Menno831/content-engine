"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { syncClientInstagram, type SyncResult } from "@/lib/sync/instagram";

export interface ActionResult {
  error?: string;
  ok?: string;
}

export async function createClientAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase is nog niet geconfigureerd (.env.local)." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Naam is verplicht." };

  const { error } = await supabase.from("clients").insert({
    agency_id: agency.id,
    name,
    ig_handle: String(formData.get("ig_handle") ?? "").trim() || null,
    monthly_value: Number(formData.get("monthly_value") ?? 0) || 0,
    status: "onboarding",
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  return { ok: `Klant "${name}" toegevoegd.` };
}

export async function syncClientAction(clientId: string): Promise<SyncResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth vereist" };

  // Eigenaarschap via RLS.
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).single();
  if (!client) return { ok: false, error: "onbekende klant" };

  const result = await syncClientInstagram(clientId);
  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  return result;
}
