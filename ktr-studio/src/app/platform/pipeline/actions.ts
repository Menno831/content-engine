"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export interface ContentActionResult {
  error?: string;
  ok?: string;
}

// Stuurt een melding (+ best-effort e-mail) naar een klant.
async function notifyClient(
  supabase: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>,
  agencyId: string,
  clientId: string,
  type: string,
  title: string,
  body: string
) {
  await supabase.from("notifications").insert({
    agency_id: agencyId,
    client_id: clientId,
    audience: "client",
    type,
    title,
    body,
    link: "/platform/pipeline",
  });
  const { data: client } = await supabase
    .from("clients")
    .select("name, contact_email")
    .eq("id", clientId)
    .single();
  if (client?.contact_email) {
    await sendEmail({
      to: client.contact_email,
      subject: title,
      html: `<p>Hoi ${client.name},</p><p>${body}</p><p>Bekijk het in je portaal.</p>`,
    });
  }
}

export async function createContentAction(
  _prev: ContentActionResult,
  formData: FormData
): Promise<ContentActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!clientId) return { error: "Kies een klant." };
  if (!title) return { error: "Titel is verplicht." };

  const stage = String(formData.get("stage") ?? "ideation");
  const editorId = String(formData.get("editor_id") ?? "");

  const { error } = await supabase.from("content").insert({
    client_id: clientId,
    title,
    hook: String(formData.get("hook") ?? "").trim() || null,
    format: String(formData.get("format") ?? "Reel"),
    content_type: String(formData.get("content_type") ?? "").trim() || null,
    deadline: String(formData.get("deadline") ?? "").trim() || null,
    editor_id: editorId || null,
    stage,
  });
  if (error) return { error: error.message };

  // Nieuwe ideation -> de klant krijgt een melding.
  if (stage === "ideation") {
    await notifyClient(supabase, agency.id, clientId, "ideation", "Nieuwe ideation staat klaar", `"${title}" staat klaar — bekijk en reageer.`);
  }

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: "Kaart toegevoegd." };
}

export async function updateContentStageAction(contentId: string, stage: string): Promise<ContentActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();

  // Posting -> registreer datum (voor editor on-time/te-laat berekening).
  const patch: Record<string, unknown> = { stage };
  if (stage === "posted") patch.posting_date = new Date().toISOString().slice(0, 10);

  const { data: updated, error } = await supabase
    .from("content")
    .update(patch)
    .eq("id", contentId)
    .select("client_id, title")
    .single();
  if (error) return { error: error.message };

  // Klant-goedkeuring nodig -> melding naar klant.
  if (stage === "client_approval" && updated && agency) {
    await notifyClient(supabase, agency.id, updated.client_id, "approval", "Content wacht op je goedkeuring", `"${updated.title}" staat klaar voor je akkoord.`);
  }

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: "Verplaatst." };
}
