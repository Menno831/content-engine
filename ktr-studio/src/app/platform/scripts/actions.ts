"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { requireTeam } from "@/lib/guard";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { MENNO_FEITEN } from "./ideaActions";

export interface ScriptResult {
  error?: string;
  ok?: string;
  id?: string;
}

export async function createScriptAction(input?: { title?: string; tag?: string }): Promise<ScriptResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const { data, error } = await supabase
    .from("scripts")
    .insert({
      agency_id: agency.id,
      title: input?.title?.trim() || "Nieuw script",
      tag: input?.tag?.trim() || null,
      status: "to_write",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: "Script aangemaakt.", id: data?.id };
}

// Autosave vanaf de editor: alleen de meegegeven velden worden bijgewerkt.
export async function updateScriptAction(
  scriptId: string,
  patch: { title?: string; content?: string; status?: string; tag?: string; location?: string; review_note?: string; client_id?: string | null }
): Promise<ScriptResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title.trim() || "Zonder titel";
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.tag !== undefined) update.tag = patch.tag.trim() || null;
  if (patch.location !== undefined) update.location = patch.location.trim() || null;
  if (patch.review_note !== undefined) update.review_note = patch.review_note.trim() || null;
  if (patch.client_id !== undefined) update.client_id = patch.client_id || null;

  const { error } = await supabase.from("scripts").update(update).eq("id", scriptId);
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: "Opgeslagen." };
}

export async function deleteScriptAction(scriptId: string): Promise<ScriptResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { error } = await supabase.from("scripts").delete().eq("id", scriptId);
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: "Script verwijderd." };
}

// ── Script bijschaven met een opdracht ──────────────────────────
// Je typt wat er anders moet; het model krijgt wie je bent, het idee
// waar het script uit komt, de huidige tekst én wat je eerder vroeg.
// De vorige versie wordt bewaard, dus terugdraaien kan altijd.
export interface RefineResult {
  ok?: boolean;
  error?: string;
  content?: string;
}

const REFINE_PROMPT = `Je schaaft een script bij voor Menno Kater. Je krijgt zijn achtergrond,
het script zoals het nu is, en wat hij nu anders wil.

{{onderwerp}}

Regels:
- Voer de opdracht uit, verander verder zo min mogelijk.
- Behoud de blokken die er staan (HOOK, CONTEXT, CHANGE, CLOSE, BEELD en, als het
  er staat, het kopje met de structuur eronder) precies zoals ze heten.
- Schrijf hele zinnen zoals hij ze inspreekt, geen aanwijzingen.
- Gebruik alleen cijfers, plekken en gebeurtenissen uit zijn achtergrond of uit het
  script zelf. Verzin niets bij.
- Antwoord met alleen het complete nieuwe script, geen inleiding, geen uitleg.`;

export async function refineScriptAction(scriptId: string, instruction: string): Promise<RefineResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!instruction.trim()) return { error: "Typ wat er anders moet." };
  if (!isClaudeConfigured()) return { error: "ANTHROPIC_API_KEY ontbreekt — zet 'm in Vercel." };

  const { data: script } = await auth.supabase
    .from("scripts")
    .select("id,title,content,tag")
    .eq("id", scriptId)
    .maybeSingle();
  if (!script) return { error: "Script niet gevonden." };

  // Het idee waar dit script uit komt (als dat er is) geeft extra context.
  const { data: idea } = await auth.supabase
    .from("content_ideas")
    .select("title,hook,angle,pillar,format,source_note")
    .eq("script_id", scriptId)
    .maybeSingle();

  // Wat hij eerder vroeg voor dit script — zo bouwt het op elkaar voort.
  const { data: history } = await auth.supabase
    .from("script_revisions")
    .select("instruction,created_at")
    .eq("script_id", scriptId)
    .order("created_at", { ascending: true })
    .limit(20);
  const eerder = (history ?? [])
    .map((h) => (h.instruction ? `- ${h.instruction}` : null))
    .filter(Boolean)
    .join("\n");

  const input = [
    `SCRIPT: ${script.title}${script.tag ? ` (${script.tag})` : ""}`,
    idea ? `KOMT UIT IDEE: ${idea.title}${idea.angle ? ` — ${idea.angle}` : ""}${idea.source_note ? ` (bron: ${idea.source_note})` : ""}` : null,
    eerder ? `WAT JE EERDER VROEG VOOR DIT SCRIPT:\n${eerder}` : null,
    `\nHUIDIGE SCRIPT:\n${script.content ?? "(nog leeg)"}`,
    `\nWAT ER NU ANDERS MOET:\n${instruction.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { text, mock } = await generateText({
    template: REFINE_PROMPT.replace("{{onderwerp}}", MENNO_FEITEN),
    input,
    model: "smart",
  });
  if (mock || !text.trim()) return { error: "AI gaf geen antwoord — controleer de key en het tegoed." };

  // Eerst de oude versie wegschrijven, dan pas overschrijven.
  await auth.supabase.from("script_revisions").insert({
    agency_id: auth.agency.id,
    script_id: scriptId,
    instruction: instruction.trim().slice(0, 500),
    content: script.content ?? "",
  });
  const { error } = await auth.supabase.from("scripts").update({ content: text.trim() }).eq("id", scriptId);
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: true, content: text.trim() };
}

/** Laatste bijschaafronde terugdraaien. */
export async function undoRefineAction(scriptId: string): Promise<RefineResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const { data: last } = await auth.supabase
    .from("script_revisions")
    .select("id,content")
    .eq("script_id", scriptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return { error: "Er is niets om terug te draaien." };

  const { error } = await auth.supabase.from("scripts").update({ content: last.content }).eq("id", scriptId);
  if (error) return { error: error.message };
  await auth.supabase.from("script_revisions").delete().eq("id", last.id);
  revalidatePath("/platform/scripts");
  return { ok: true, content: String(last.content) };
}
