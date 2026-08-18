"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface EditorActionResult {
  error?: string;
  ok?: string;
}

export async function createEditorAction(
  _prev: EditorActionResult,
  formData: FormData
): Promise<EditorActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Naam is verplicht." };

  const { error } = await supabase.from("editors").insert({
    agency_id: agency.id,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
    pay_per_video: Number(formData.get("pay_per_video") ?? 0) || 0,
    specialty: String(formData.get("specialty") ?? "").trim() || null,
    pool_status: String(formData.get("pool_status") ?? "actief").trim() || "actief",
    contact: String(formData.get("contact") ?? "").trim() || null,
    portfolio_url: String(formData.get("portfolio_url") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/editors");
  return { ok: `Editor "${name}" toegevoegd.` };
}

export async function updateEditorPoolAction(editorId: string, status: string): Promise<EditorActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase
    .from("editors")
    .update({ pool_status: status, active: status === "actief" })
    .eq("id", editorId);
  if (error) return { error: error.message };
  revalidatePath("/platform/editors");
  return { ok: "Status bijgewerkt." };
}


// ── Editor bewerken en verwijderen ──────────────────────────────
export async function updateEditorAction(
  editorId: string,
  patch: { name?: string; email?: string; pay_per_video?: number; specialty?: string; contact?: string; portfolio_url?: string; notes?: string }
): Promise<EditorActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim() || "Editor";
  if (patch.email !== undefined) update.email = patch.email.trim() || null;
  if (patch.pay_per_video !== undefined) update.pay_per_video = Number(patch.pay_per_video) || 0;
  if (patch.specialty !== undefined) update.specialty = patch.specialty.trim() || null;
  if (patch.contact !== undefined) update.contact = patch.contact.trim() || null;
  if (patch.portfolio_url !== undefined) update.portfolio_url = patch.portfolio_url.trim() || null;
  if (patch.notes !== undefined) update.notes = patch.notes.trim() || null;

  const { error } = await supabase.from("editors").update(update).eq("id", editorId);
  if (error) return { error: error.message };

  revalidatePath("/platform/editors");
  revalidatePath("/platform/pipeline");
  return { ok: "Opgeslagen." };
}

export async function deleteEditorAction(editorId: string): Promise<EditorActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  // .select() erbij: zonder delete-policy filtert RLS alles stilletjes weg —
  // dan melden we eerlijk dat migratie 023 nog moet draaien.
  const { data: deleted, error } = await supabase.from("editors").delete().eq("id", editorId).select("id");
  if (error) return { error: error.message };
  if (!deleted?.length) return { error: "Niet verwijderd — draai migratie 023 in Supabase (delete-rechten editors)." };

  revalidatePath("/platform/editors");
  revalidatePath("/platform/pipeline");
  return { ok: "Editor verwijderd." };
}
