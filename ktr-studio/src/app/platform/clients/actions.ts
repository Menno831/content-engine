"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/auth";
import { syncClientAll, type ClientSyncResult } from "@/lib/sync/client";
import { INTAKE_QUESTIONS, synthesizeBrandDocs } from "@/lib/intake";

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
    yt_channel_id: String(formData.get("yt_channel_id") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    monthly_value: Number(formData.get("monthly_value") ?? 0) || 0,
    status: "onboarding",
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  return { ok: `Klant "${name}" toegevoegd.` };
}

export async function syncAllClientsAction(): Promise<{ ok: boolean; synced?: number; total?: number; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth vereist" };

  const { data: clients } = await supabase.from("clients").select("id");
  let synced = 0;
  for (const c of clients ?? []) {
    const r = await syncClientAll(c.id);
    if (r.ok) synced++;
  }
  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  return { ok: true, synced, total: clients?.length ?? 0 };
}

export async function syncClientAction(clientId: string): Promise<ClientSyncResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, items: 0, error: "Supabase niet geconfigureerd." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, items: 0, error: "auth vereist" };

  // Eigenaarschap via RLS.
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).single();
  if (!client) return { ok: false, items: 0, error: "onbekende klant" };

  const result = await syncClientAll(clientId);
  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  return result;
}

// Brand-context (identity, story, strategy, voice, notities) opslaan.
export async function saveBrandDocsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Onbekende klant." };

  const { error } = await supabase
    .from("clients")
    .update({
      brand_identity: String(formData.get("brand_identity") ?? "").trim() || null,
      brand_story: String(formData.get("brand_story") ?? "").trim() || null,
      brand_strategy: String(formData.get("brand_strategy") ?? "").trim() || null,
      brand_voice: String(formData.get("brand_voice") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: "Brand-context opgeslagen." };
}

// ── Brand voice intake ──────────────────────────────────────────

// Intake-antwoorden opslaan en (met API-key) omzetten in branddocs.
export async function runIntakeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Onbekende klant." };

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, ig_handle")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Onbekende klant." };

  const answers: Record<string, string> = {};
  for (const q of INTAKE_QUESTIONS) {
    answers[q.key] = String(formData.get(`q_${q.key}`) ?? "").trim();
  }
  if (!Object.values(answers).some(Boolean)) return { error: "Beantwoord minimaal één vraag." };

  // Transcripten (ruwe spraak) wegen het zwaarst voor de voice.
  const { data: trans } = await supabase
    .from("transcripts")
    .select("title, content")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const docs = await synthesizeBrandDocs(client.name, client.ig_handle ?? "", answers, trans ?? []).catch(() => null);

  const update: Record<string, unknown> = { intake_answers: answers };
  if (docs) {
    if (docs.identity) update.brand_identity = docs.identity;
    if (docs.story) update.brand_story = docs.story;
    if (docs.strategy) update.brand_strategy = docs.strategy;
    if (docs.voice) update.brand_voice = docs.voice;
  }

  const { error } = await supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/platform/clients/${clientId}`);
  return {
    ok: docs
      ? `Intake verwerkt${trans?.length ? ` (incl. ${trans.length} transcript${trans.length === 1 ? "" : "en"})` : ""} — branddocumenten gegenereerd. Lees ze na en stel bij waar nodig.`
      : "Antwoorden opgeslagen. Koppel ANTHROPIC_API_KEY om er automatisch branddocumenten van te maken.",
  };
}

// ── Transcripten (brand voice bron, bijv. uit Transkriptor) ─────

export async function addTranscriptAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const clientId = String(formData.get("client_id") ?? "");
  const content = String(formData.get("content") ?? "").trim().slice(0, 500_000);
  if (!clientId) return { error: "Onbekende klant." };
  if (content.length < 100) return { error: "Transcript is te kort (min. 100 tekens) — plak de volledige tekst." };

  const title = String(formData.get("title") ?? "").trim() || `Transcript ${new Date().toLocaleDateString("nl-NL")}`;

  const { error } = await supabase.from("transcripts").insert({
    agency_id: agency.id,
    client_id: clientId,
    title,
    content,
  });
  if (error) return { error: error.message };

  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: `Transcript "${title}" toegevoegd (${content.length.toLocaleString("nl-NL")} tekens).` };
}

export async function deleteTranscriptAction(transcriptId: string, clientId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase.from("transcripts").delete().eq("id", transcriptId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: "Transcript verwijderd." };
}

// Branddocs (her)genereren uit alles wat er ligt: intake + transcripten.
export async function regenerateBrandDocsAction(clientId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, ig_handle, intake_answers")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Onbekende klant." };

  const { data: trans } = await supabase
    .from("transcripts")
    .select("title, content")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const answers = (client.intake_answers as Record<string, string> | null) ?? {};
  const hasAnswers = Object.values(answers).some(Boolean);
  if (!hasAnswers && !(trans?.length)) {
    return { error: "Nog geen bronmateriaal — vul de intake in of voeg een transcript toe." };
  }

  const docs = await synthesizeBrandDocs(client.name, client.ig_handle ?? "", answers, trans ?? []).catch(() => null);
  if (!docs) return { error: "Genereren mislukt — is ANTHROPIC_API_KEY gekoppeld?" };

  const update: Record<string, unknown> = {};
  if (docs.identity) update.brand_identity = docs.identity;
  if (docs.story) update.brand_story = docs.story;
  if (docs.strategy) update.brand_strategy = docs.strategy;
  if (docs.voice) update.brand_voice = docs.voice;

  const { error } = await supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: `Branddocumenten opnieuw gegenereerd uit ${trans?.length ?? 0} transcript(en)${hasAnswers ? " + intake" : ""}.` };
}

// Deelbare intake-link aanmaken zodat de klant de vragen zelf invult.
export async function createIntakeLinkAction(clientId: string): Promise<{ error?: string; url?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  // Bestaande token hergebruiken zodat een eerder gedeelde link blijft werken.
  const { data: client } = await supabase
    .from("clients")
    .select("id, intake_token")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Onbekende klant." };

  let token = client.intake_token as string | null;
  if (!token) {
    token = randomBytes(18).toString("base64url");
    const { error } = await supabase.from("clients").update({ intake_token: token }).eq("id", clientId);
    if (error) return { error: error.message };
  }
  return { url: `/intake/${token}` };
}

// ── Opdrachten (per klant, met automatische marge) ──────────────

export async function createOrderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!clientId) return { error: "Onbekende klant." };
  if (!title) return { error: "Titel is verplicht." };

  const { error } = await supabase.from("orders").insert({
    agency_id: agency.id,
    client_id: clientId,
    title,
    deliverables: String(formData.get("deliverables") ?? "").trim() || null,
    price: Number(formData.get("price") ?? 0) || 0,
    editor_cost: Number(formData.get("editor_cost") ?? 0) || 0,
    other_cost: Number(formData.get("other_cost") ?? 0) || 0,
    deadline: String(formData.get("deadline") ?? "") || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: `Opdracht "${title}" toegevoegd.` };
}

export async function updateOrderStatusAction(orderId: string, clientId: string, status: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: "Status bijgewerkt." };
}

export async function deleteOrderAction(orderId: string, clientId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}`);
  return { ok: "Opdracht verwijderd." };
}

// Klant verwijderen (alleen owner/team; content/leads/etc. cascaden mee).
export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  redirect("/platform/clients");
}
