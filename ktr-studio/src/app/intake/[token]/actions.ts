"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { INTAKE_QUESTIONS, synthesizeBrandDocs } from "@/lib/intake";

export interface IntakeResult {
  error?: string;
  ok?: boolean;
}

/**
 * Publieke intake-submit (klant, zonder login). Het token is de toegang;
 * we schrijven via de service-role omdat anoniem geen RLS-rechten heeft.
 * Slaat de antwoorden op en genereert direct de branddocumenten.
 */
export async function submitIntakeAction(_prev: IntakeResult, formData: FormData): Promise<IntakeResult> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Ongeldige link." };

  const admin = createAdminClient();
  if (!admin) return { error: "Server niet geconfigureerd." };

  const { data: client } = await admin
    .from("clients")
    .select("id, name, ig_handle")
    .eq("intake_token", token)
    .single();
  if (!client) return { error: "Deze intake-link is niet (meer) geldig." };

  const answers: Record<string, string> = {};
  for (const q of INTAKE_QUESTIONS) {
    answers[q.key] = String(formData.get(`q_${q.key}`) ?? "").trim().slice(0, 2000);
  }
  if (!Object.values(answers).some(Boolean)) return { error: "Beantwoord minimaal één vraag." };

  // Eventueel al geüploade transcripten meenemen in de synthese.
  const { data: trans } = await admin
    .from("transcripts")
    .select("title, content")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const docs = await synthesizeBrandDocs(client.name, client.ig_handle ?? "", answers, trans ?? []).catch(() => null);

  const update: Record<string, unknown> = { intake_answers: answers };
  if (docs) {
    if (docs.identity) update.brand_identity = docs.identity;
    if (docs.story) update.brand_story = docs.story;
    if (docs.strategy) update.brand_strategy = docs.strategy;
    if (docs.voice) update.brand_voice = docs.voice;
  }

  const { error } = await admin.from("clients").update(update).eq("id", client.id);
  if (error) return { error: "Opslaan mislukt — probeer het opnieuw." };

  return { ok: true };
}
