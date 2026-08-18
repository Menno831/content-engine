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
