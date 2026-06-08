"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/auth";
import { syncClientInstagram, type SyncResult } from "@/lib/sync/instagram";

export interface ActionResult {
  error?: string;
  ok?: string;
}

export interface PortalResult {
  error?: string;
  ok?: string;
  email?: string;
  password?: string;
}

// Maak een portaal-login voor een klant: eigen account (role 'client')
// gekoppeld aan precies deze klant. Geeft het tijdelijke wachtwoord één
// keer terug zodat de agency het kan doorgeven.
export async function grantPortalAccessAction(
  _prev: PortalResult,
  formData: FormData
): Promise<PortalResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!clientId) return { error: "Onbekende klant." };
  if (!email) return { error: "Vul een e-mailadres in." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  // Eigenaarschap + naam via RLS.
  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Onbekende klant." };

  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." };

  const password = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) + "9!";

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created?.user) {
    return { error: /registered|exists/i.test(error?.message ?? "") ? "Dit e-mailadres heeft al een account." : (error?.message ?? "Aanmaken mislukt.") };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    user_id: created.user.id,
    agency_id: agency.id,
    role: "client",
    client_id: clientId,
    full_name: client.name,
  });
  if (profileErr) {
    // Rol-koppeling mislukt -> ruim de losse auth-user weer op.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileErr.message };
  }

  revalidatePath("/platform/clients");
  return {
    ok: `Portaaltoegang voor ${client.name} aangemaakt.`,
    email,
    password,
  };
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
