"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export interface TodoActionResult {
  error?: string;
  ok?: string;
}

export async function createTodoAction(
  _prev: TodoActionResult,
  formData: FormData
): Promise<TodoActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "").trim() || null;
  if (!clientId) return { error: "Kies een klant." };
  if (!title) return { error: "Omschrijving is verplicht." };

  const { error } = await supabase.from("todos").insert({
    agency_id: agency.id,
    client_id: clientId,
    title,
    due,
  });
  if (error) return { error: error.message };

  // Notificatie + (best-effort) e-mail naar de klant.
  await supabase.from("notifications").insert({
    agency_id: agency.id,
    client_id: clientId,
    audience: "client",
    type: "todo",
    title: "Nieuwe taak voor je",
    body: title,
    link: "/platform/todos",
  });

  const { data: client } = await supabase
    .from("clients")
    .select("name, contact_email")
    .eq("id", clientId)
    .single();
  if (client?.contact_email) {
    await sendEmail({
      to: client.contact_email,
      subject: "Nieuwe taak in je portaal",
      html: `<p>Hoi ${client.name},</p><p>Er staat een nieuwe taak voor je klaar: <strong>${title}</strong>.</p><p>Log in op je portaal om 'm af te vinken.</p>`,
    });
  }

  revalidatePath("/platform/todos");
  revalidatePath("/platform");
  return { ok: "Taak toegevoegd." };
}

export async function toggleTodoAction(todoId: string, done: boolean): Promise<TodoActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { error } = await supabase.from("todos").update({ done }).eq("id", todoId);
  if (error) return { error: error.message };

  revalidatePath("/platform/todos");
  return { ok: "Bijgewerkt." };
}

export async function markNotificationsReadAction(): Promise<void> {
  const supabase = await supabaseServer();
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("read", false);
  revalidatePath("/platform");
}


// ── Persoonlijke taken (geen klant): vandaag of lange termijn ───
export async function createPersonalTodoAction(title: string, urgency: "vandaag" | "later"): Promise<TodoActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency, user } = await getSessionContext();
  if (!agency || !user) return { error: "Geen agency — log opnieuw in." };
  if (!title.trim()) return { error: "Omschrijving is verplicht." };

  const { error } = await supabase.from("todos").insert({
    agency_id: agency.id,
    client_id: null,
    user_id: user.id,
    urgency,
    title: title.trim(),
  });
  if (error) return { error: error.message.includes("client_id") ? "Draai migratie 023 in Supabase (persoonlijke taken)." : error.message };

  revalidatePath("/platform/todos");
  revalidatePath("/platform");
  return { ok: "Taak toegevoegd." };
}

export async function deleteTodoAction(todoId: string): Promise<TodoActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("todos").delete().eq("id", todoId);
  if (error) return { error: error.message };
  revalidatePath("/platform/todos");
  return { ok: "Taak verwijderd." };
}
