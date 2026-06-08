"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/auth";

export interface ApprovalResult {
  ok?: boolean;
  error?: string;
}

// Klant keurt content goed (-> ready_for_posting) of vraagt revisie
// (-> revisions_needed). De schrijf gaat via de admin-client na een
// strikte eigenaarschaps- en fase-check, zodat RLS strak blijft.
async function clientTransition(contentId: string, approve: boolean, note: string): Promise<ApprovalResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const ctx = await getSessionContext();
  if (!ctx.user) return { error: "auth vereist" };

  // Haal de content op binnen de RLS-scope van de gebruiker.
  const { data: content } = await supabase
    .from("content")
    .select("id, client_id, title, stage")
    .eq("id", contentId)
    .single();
  if (!content) return { error: "Niet gevonden." };
  if (content.stage !== "client_approval") return { error: "Deze content wacht niet op goedkeuring." };

  // Client-login: alleen eigen content. Agency mag ook namens klant.
  if (ctx.profile?.role === "client" && ctx.profile.client_id !== content.client_id) {
    return { error: "Geen toegang." };
  }

  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." };

  const nextStage = approve ? "ready_for_posting" : "revisions_needed";
  const { error } = await admin.from("content").update({ stage: nextStage }).eq("id", contentId);
  if (error) return { error: error.message };

  // Meld het terug aan de agency.
  await admin.from("notifications").insert({
    agency_id: ctx.agency?.id ?? null,
    client_id: content.client_id,
    audience: "agency",
    type: approve ? "approval" : "revision",
    title: approve ? "Klant keurde content goed" : "Klant vraagt revisie",
    body: approve ? `"${content.title}" is goedgekeurd.` : `"${content.title}": ${note || "revisie gevraagd"}`,
    link: "/platform/pipeline",
  });

  revalidatePath("/platform/approvals");
  revalidatePath("/platform/pipeline");
  return { ok: true };
}

export async function approveContentAction(contentId: string): Promise<ApprovalResult> {
  return clientTransition(contentId, true, "");
}

export async function requestRevisionAction(contentId: string, note: string): Promise<ApprovalResult> {
  return clientTransition(contentId, false, note);
}
