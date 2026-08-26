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

// ── Ochtendscan ─────────────────────────────────────────────────
import { createAdminClient } from "@/lib/supabase/admin";
import { runFeedScan } from "@/lib/feedscan";

export async function saveFeedNoteAction(id: string, note: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("feed_items").update({ note: note || null }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: "Opgeslagen." };
}

export async function dismissFeedItemAction(id: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("feed_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/discover");
  return { ok: "Weggehaald." };
}

export async function saveFeedSourcesAction(channels: string, topics: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency." };
  const { error } = await supabase
    .from("agencies")
    .update({ feed_channels: channels.slice(0, 500), feed_topics: topics.slice(0, 300) })
    .eq("id", agency.id);
  if (error) return { error: error.message };
  revalidatePath("/platform/discover");
  return { ok: "Bronnen opgeslagen." };
}

export async function runFeedScanAction(): Promise<ActionResult> {
  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency." };
  if (profile?.role === "client" || profile?.role === "editor") return { error: "Geen rechten." };
  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." };
  const r = await runFeedScan(admin, agency.id);
  if (r.error) return { error: r.error };
  revalidatePath("/platform/discover");
  return { ok: r.added ? `${r.added} nieuwe video's gevonden.` : "Niks nieuws gevonden — alles al gezien." };
}
