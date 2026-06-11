"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface LeadActionResult {
  error?: string;
  ok?: string;
}

const STAGES = ["nieuw", "gekwalificeerd", "call_gepland", "closed", "verloren"] as const;
type Stage = (typeof STAGES)[number];

export async function createLeadAction(
  _prev: LeadActionResult,
  formData: FormData
): Promise<LeadActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const clientId = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId) return { error: "Kies een klant." };
  if (!name) return { error: "Naam is verplicht." };

  const sourceContentId = String(formData.get("source_content_id") ?? "");

  const { error } = await supabase.from("leads").insert({
    client_id: clientId,
    name,
    source_label: String(formData.get("source_label") ?? "").trim() || null,
    source_content_id: sourceContentId || null,
    value: Number(formData.get("value") ?? 0) || 0,
    setter: String(formData.get("setter") ?? "").trim() || null,
    stage: "nieuw",
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/leads");
  revalidatePath("/platform");
  return { ok: "Lead toegevoegd." };
}

// Follow-up datum + notitie zetten (setter weet wie wanneer op te volgen).
export async function setFollowupAction(leadId: string, date: string, note: string): Promise<LeadActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase
    .from("leads")
    .update({
      next_followup: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      followup_note: note.trim() || null,
    })
    .eq("id", leadId);
  if (error) return { error: error.message };
  revalidatePath("/platform/leads");
  return { ok: "Follow-up gezet." };
}

export async function updateLeadStageAction(leadId: string, stage: string): Promise<LeadActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  if (!STAGES.includes(stage as Stage)) return { error: "Ongeldige fase." };

  const patch: Record<string, unknown> = { stage };
  // Zet/wis closed_at zodat omzet-attributie per maand klopt.
  patch.closed_at = stage === "closed" ? new Date().toISOString() : null;

  const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
  if (error) return { error: error.message };

  revalidatePath("/platform/leads");
  revalidatePath("/platform");
  return { ok: "Bijgewerkt." };
}
