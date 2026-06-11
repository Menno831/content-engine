"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { syncCompetitorCore } from "@/lib/sync/competitors";

export interface ActionResult {
  error?: string;
  ok?: string;
}

export async function addCompetitorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "");
  if (!handle) return { error: "Handle is verplicht." };

  const { data: inserted, error } = await supabase
    .from("competitors")
    .insert({
      agency_id: agency.id,
      handle: `@${handle}`,
      niche: String(formData.get("niche") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) {
    return { error: /duplicate|unique/i.test(error.message) ? "Deze handle volg je al." : error.message };
  }

  // Direct eerste sync proberen (stil falen mag — knop blijft beschikbaar).
  if (inserted) await syncCompetitorAction(inserted.id).catch(() => null);

  revalidatePath("/platform/discover");
  return { ok: `@${handle} toegevoegd.` };
}

export async function deleteCompetitorAction(competitorId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase.from("competitors").delete().eq("id", competitorId);
  if (error) return { error: error.message };
  revalidatePath("/platform/discover");
  return { ok: "Niet meer gevolgd." };
}

// Posts van één competitor ophalen via de scraper en wegschrijven.
export async function syncCompetitorAction(competitorId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  // Eigenaarschap via RLS; de kern draait daarna via de service-role.
  const { data: comp } = await supabase
    .from("competitors")
    .select("id, handle")
    .eq("id", competitorId)
    .maybeSingle();
  if (!comp) return { error: "Onbekende competitor." };

  const result = await syncCompetitorCore(comp.id);
  if (!result.ok) return { error: result.error ?? "sync mislukt" };

  revalidatePath("/platform/discover");
  return { ok: `${comp.handle}: ${result.items} posts gesynct.` };
}
