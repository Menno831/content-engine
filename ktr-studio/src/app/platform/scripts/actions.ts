"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

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
