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
