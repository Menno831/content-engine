"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Editor mailen als er werk voor 'm klaarstaat (best-effort, Engels —
// werkt zodra RESEND_API_KEY staat).
async function notifyEditor(
  supabase: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>,
  editorId: string,
  clientId: string,
  title: string
) {
  const [{ data: editor }, { data: client }] = await Promise.all([
    supabase.from("editors").select("name, email").eq("id", editorId).maybeSingle(),
    supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
  ]);
  if (!editor?.email) return;
  await sendEmail({
    to: editor.email,
    subject: "🎬 New video ready for editing",
    html: `<p>Hi ${editor.name ?? ""},</p><p>A new video is ready for you to edit:</p><p><strong>${title}</strong> · ${client?.name ?? ""}</p><p>The files are linked on the card. Drag it to "Quality Control" when you're done.</p><p><a href="https://content-engine-kr5c.vercel.app/platform/pipeline">Open the production board</a></p>`,
  });
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
    format: String(formData.get("format") ?? "Talking"),
    content_type: String(formData.get("content_type") ?? "").trim() || null,
    deadline: String(formData.get("deadline") ?? "").trim() || null,
    editor_id: editorId || null,
    brief_url: String(formData.get("brief_url") ?? "").trim() || null,
    posting_date: String(formData.get("posting_date") ?? "").trim() || null,
    frame_url: String(formData.get("frame_url") ?? "").trim() || null,
    vo_url: String(formData.get("vo_url") ?? "").trim() || null,
    reference_url: String(formData.get("reference_url") ?? "").trim() || null,
    footage_notes: String(formData.get("footage_notes") ?? "").trim() || null,
    stage,
  });
  if (error) return { error: error.message };

  // Nieuwe ideation -> de klant krijgt een melding.
  if (stage === "ideation") {
    await notifyClient(supabase, agency.id, clientId, "ideation", "Nieuwe ideation staat klaar", `"${title}" staat klaar — bekijk en reageer.`);
  }

  // Kaart staat klaar voor de editor -> mail de editor direct.
  if (stage === "ready_for_editing" && editorId) {
    await notifyEditor(supabase, editorId, clientId, title).catch(() => undefined);
  }

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: "Kaart toegevoegd." };
}

// Vanuit de Studio: een gegenereerde hook + script direct op het
// productieboard zetten (start in 'ideation', klaar voor de editor).
export async function scriptToBoardAction(input: {
  clientId: string;
  title: string;
  hook: string;
  script: string;
}): Promise<ContentActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };
  if (!input.clientId) return { error: "Kies een klant." };

  const title = input.title.trim().slice(0, 120) || "Nieuw script";
  const { error } = await supabase.from("content").insert({
    client_id: input.clientId,
    title,
    hook: input.hook.trim().slice(0, 300) || null,
    script: input.script.trim() || null,
    format: "Reel",
    stage: "ideation",
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: `"${title}" staat op het productieboard.` };
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
    .select("client_id, title, external_id, editor_id")
    .single();
  if (error) return { error: error.message };

  // Kaart schuift naar "Ready for editing" met een editor erop -> mail 'm.
  if (stage === "ready_for_editing" && updated?.editor_id) {
    await notifyEditor(supabase, updated.editor_id, updated.client_id, updated.title).catch(() => undefined);
  }

  // Twee-weg-sync: kwam deze kaart uit Asana, verplaats de taak daar dan
  // ook naar de bijbehorende sectie (best-effort, blokkeert nooit).
  if (updated?.external_id?.startsWith("asana:")) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("asana_project_id")
      .eq("id", updated.client_id)
      .maybeSingle();
    if (clientRow?.asana_project_id) {
      const { moveAsanaTaskToStage } = await import("@/lib/integrations/asana");
      await moveAsanaTaskToStage(
        clientRow.asana_project_id as string,
        updated.external_id.slice("asana:".length),
        stage
      ).catch(() => undefined);
    }
  }

  // Klant-goedkeuring nodig -> melding naar klant.
  if (stage === "client_approval" && updated && agency) {
    await notifyClient(supabase, agency.id, updated.client_id, "approval", "Content wacht op je goedkeuring", `"${updated.title}" staat klaar voor je akkoord.`);
  }

  // Editor levert aan (-> Quality Control): melding + mail naar de eigenaar,
  // en delivered_at vastleggen voor de on-time/te-laat-berekening.
  if (stage === "quality_control" && updated && agency) {
    await supabase.from("content").update({ delivered_at: new Date().toISOString() }).eq("id", contentId);

    const { data: clientRow } = await supabase
      .from("clients")
      .select("name")
      .eq("id", updated.client_id)
      .maybeSingle();
    const clientName = clientRow?.name ?? "een klant";

    await supabase.from("notifications").insert({
      agency_id: agency.id,
      audience: "team",
      type: "review",
      title: "Video aangeleverd — klaar voor review",
      body: `"${updated.title}" (${clientName}) staat in Quality Control.`,
      link: "/platform/pipeline",
    });

    // E-mail naar de agency-eigenaar (best-effort; werkt zodra RESEND_API_KEY staat).
    const admin = createAdminClient();
    if (admin) {
      const { data: agencyRow } = await admin.from("agencies").select("owner_id").eq("id", agency.id).maybeSingle();
      if (agencyRow?.owner_id) {
        const { data: ownerUser } = await admin.auth.admin.getUserById(agencyRow.owner_id as string);
        await sendEmail({
          to: ownerUser?.user?.email,
          subject: `🎬 Klaar voor review: ${updated.title}`,
          html: `<p>Er staat een video klaar voor review.</p><p><strong>${updated.title}</strong> · ${clientName}</p><p><a href="https://content-engine-kr5c.vercel.app/platform/pipeline">Open het productieboard</a></p>`,
        });
      }
    }
  }

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: "Verplaatst." };
}

// ── Kaart openen, bewerken en verwijderen ───────────────────────
// De kaart op het board toont een samenvatting; wie erop klikt krijgt
// alle velden. Detail wordt pas bij openen opgehaald (board blijft licht).

export interface ContentDetail {
  id: string;
  title: string;
  hook: string;
  format: string;
  content_type: string;
  stage: string;
  deadline: string;
  posting_date: string;
  editor_id: string;
  brief_url: string;
  frame_url: string;
  vo_url: string;
  reference_url: string;
  footage_notes: string;
}

export async function getContentDetailAction(
  contentId: string
): Promise<{ error?: string; data?: ContentDetail }> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { data, error } = await supabase
    .from("content")
    .select(
      "id,title,hook,format,content_type,stage,deadline,posting_date,editor_id,brief_url,frame_url,vo_url,reference_url,footage_notes"
    )
    .eq("id", contentId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Kaart niet gevonden." };

  return {
    data: {
      id: data.id,
      title: data.title ?? "",
      hook: data.hook ?? "",
      format: data.format ?? "Talking",
      content_type: data.content_type ?? "",
      stage: data.stage ?? "ideation",
      deadline: data.deadline ?? "",
      posting_date: data.posting_date ?? "",
      editor_id: data.editor_id ?? "",
      brief_url: data.brief_url ?? "",
      frame_url: data.frame_url ?? "",
      vo_url: data.vo_url ?? "",
      reference_url: data.reference_url ?? "",
      footage_notes: data.footage_notes ?? "",
    },
  };
}

export async function updateContentAction(
  _prev: ContentActionResult,
  formData: FormData
): Promise<ContentActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const contentId = String(formData.get("content_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!contentId) return { error: "Onbekende kaart." };
  if (!title) return { error: "Titel is verplicht." };

  const editorId = String(formData.get("editor_id") ?? "");
  const { error } = await supabase
    .from("content")
    .update({
      title,
      hook: String(formData.get("hook") ?? "").trim() || null,
      format: String(formData.get("format") ?? "Talking"),
      content_type: String(formData.get("content_type") ?? "").trim() || null,
      deadline: String(formData.get("deadline") ?? "").trim() || null,
      posting_date: String(formData.get("posting_date") ?? "").trim() || null,
      editor_id: editorId || null,
      brief_url: String(formData.get("brief_url") ?? "").trim() || null,
      frame_url: String(formData.get("frame_url") ?? "").trim() || null,
      vo_url: String(formData.get("vo_url") ?? "").trim() || null,
      reference_url: String(formData.get("reference_url") ?? "").trim() || null,
      footage_notes: String(formData.get("footage_notes") ?? "").trim() || null,
    })
    .eq("id", contentId);
  if (error) return { error: error.message };

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: "Kaart opgeslagen." };
}

export async function deleteContentAction(contentId: string): Promise<ContentActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  // .select() erbij: zo zien we of er echt iets verwijderd is. Zonder
  // delete-policy filtert RLS stilletjes alles weg en "lukt" de delete
  // terwijl de kaart blijft staan — dat melden we dan eerlijk.
  const { data: deleted, error } = await supabase
    .from("content")
    .delete()
    .eq("id", contentId)
    .select("id");
  if (error) return { error: error.message };
  if (!deleted?.length) return { error: "Niet verwijderd — draai migratie 020 in Supabase (delete-rechten) en probeer opnieuw." };

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: "Kaart verwijderd." };
}

// ── Wekelijkse productieplanning ────────────────────────────────
// Eén actie maakt de vaste week aan: vijf formats, vijf dagen, met de
// briefing er al in. Dinsdag de longform, daarna elke dag een lichter
// format. Deadline staat standaard een dag voor de publicatiedatum.
const WEEKSJABLOON = [
  {
    dag: 0,
    format: "Longform",
    titel: "Longform",
    brief:
      "Rustig tempo, b-roll bij elk voorbeeld dat genoemd wordt, duidelijke scheiding tussen hoofdstukken. De geanimeerde intro is een asset: bouw hem zo dat hij los werkt, want hij komt voor elke clip uit deze video.",
  },
  {
    dag: 1,
    format: "Clip",
    titel: "Clip uit de longform",
    brief:
      "Snijden uit de longform van deze week, geen nieuw materiaal. Begin altijd met de geanimeerde intro uit die video. Eén punt, één payoff, knippen op het laatste woord. Laat bewust iets open: de DM-automation stuurt de volledige video na zodra iemand reageert.",
  },
  {
    dag: 2,
    format: "Lifestyle",
    titel: "Lifestyle",
    brief:
      "Tien tot vijftien seconden uit de gegradede trip-reel. Eén track, één regel tekst. Geen transitions, geen effecten. Bestaat die gegradede reel nog niet voor deze trip, grade dan eerst de hele trip in één keer.",
  },
  {
    dag: 3,
    format: "VO story",
    titel: "VO story",
    brief:
      "De voice over leidt, knip het beeld op de woorden. Eén beeld per gedachte. Ondertiteling aan, koud openen, hard knippen na de laatste zin, geen outro.",
  },
  {
    dag: 4,
    format: "Talking",
    titel: "Talking",
    brief:
      "Verse Boedapest- en Estland-b-roll erin, oudere shots eruit. Koud openen op de sterkste zin, hard eindigen.",
  },
];

function volgendeDinsdag(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const delta = (2 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function alsDatum(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function generateWeekAction(
  _prev: ContentActionResult,
  formData: FormData
): Promise<ContentActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Kies eerst een klant." };

  const editorId = String(formData.get("editor_id") ?? "");
  const dinsdag = volgendeDinsdag();
  const label = dinsdag.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

  const rijen = WEEKSJABLOON.map((s) => {
    const live = new Date(dinsdag);
    live.setDate(dinsdag.getDate() + s.dag);
    const deadline = new Date(live);
    deadline.setDate(live.getDate() - 1);
    return {
      client_id: clientId,
      title: `${s.titel} ${label}`,
      format: s.format,
      stage: "ready_for_editing",
      posting_date: alsDatum(live),
      deadline: alsDatum(deadline),
      editor_id: editorId || null,
      footage_notes: s.brief,
    };
  });

  const { error } = await supabase.from("content").insert(rijen);
  if (error) return { error: error.message };

  revalidatePath("/platform/pipeline");
  revalidatePath("/platform");
  return { ok: `Week van ${label} aangemaakt: vijf kaarten met briefing.` };
}
