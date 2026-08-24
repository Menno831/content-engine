"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface ProspectResult {
  error?: string;
  ok?: string;
}

const STAGES = ["te_contacteren", "dm_verstuurd", "in_gesprek", "audit_verstuurd", "geen_reactie"] as const;

export async function createProspectAction(_prev: ProspectResult, formData: FormData): Promise<ProspectResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Naam is verplicht." };

  const { error } = await supabase.from("prospects").insert({
    agency_id: agency.id,
    name,
    instagram: String(formData.get("instagram") ?? "").trim() || null,
    youtube: String(formData.get("youtube") ?? "").trim() || null,
    weakness: String(formData.get("weakness") ?? "").trim() || null,
    potential_value: Number(formData.get("potential_value") ?? 0) || 0,
    note: String(formData.get("note") ?? "").trim() || null,
    message: String(formData.get("message") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/outreach");
  return { ok: "Prospect toegevoegd." };
}

export async function updateProspectStageAction(prospectId: string, stage: string): Promise<ProspectResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  if (!STAGES.includes(stage as (typeof STAGES)[number])) return { error: "Ongeldige fase." };

  // DM verstuurd -> tijdstip vastleggen voor de dagteller.
  const patch: Record<string, unknown> = { stage };
  if (stage === "dm_verstuurd") patch.dm_sent_at = new Date().toISOString();
  const { error } = await supabase.from("prospects").update(patch).eq("id", prospectId);
  if (error) return { error: error.message };

  revalidatePath("/platform/outreach");
  return { ok: "Bijgewerkt." };
}

// AI-concept-DM voor één prospect — overschrijft nooit een bestaand
// bericht zonder dat je dat expliciet vraagt (force).
export async function generateProspectDmAction(prospectId: string, force = false): Promise<ProspectResult & { message?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { data: p } = await supabase
    .from("prospects")
    .select("id, name, instagram, youtube, weakness, note, message")
    .eq("id", prospectId)
    .maybeSingle();
  if (!p) return { error: "Prospect niet gevonden." };
  if (p.message && !force) return { error: "Er staat al een bericht — verwijder het eerst of genereer opnieuw." };

  const { DM_TEMPLATE } = await import("@/lib/watchdog");
  const { generateText } = await import("@/lib/ai");
  const context = [
    `Naam: ${p.name}`,
    p.instagram ? `Instagram: ${p.instagram}` : null,
    p.youtube ? `YouTube: ${p.youtube}` : null,
    p.weakness ? `Observatie (alleen als positieve invalshoek gebruiken, niet benoemen als zwakte): ${p.weakness}` : null,
    p.note ? `Notitie: ${p.note}` : null,
  ].filter(Boolean).join("\n");

  const { text, mock } = await generateText({ template: DM_TEMPLATE, input: context, model: "smart" });
  if (mock) return { error: "AI-key ontbreekt in deze omgeving." };

  const message = text.trim();
  const { error } = await supabase
    .from("prospects")
    .update({ message, message_generated_at: new Date().toISOString() })
    .eq("id", prospectId);
  if (error) return { error: error.message };

  revalidatePath("/platform/outreach");
  return { ok: "concept klaargezet", message };
}
