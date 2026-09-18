"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { syncCompetitorCore } from "@/lib/sync/competitors";
import { scoreUncheckedPosts } from "@/lib/fit";
import { requireTeam } from "@/lib/guard";

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


// ── Strategie-check: beoordeel alles wat nog geen oordeel heeft ──
export async function scoreFitAction(): Promise<ActionResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const r = await scoreUncheckedPosts(auth.supabase, 60);
  revalidatePath("/platform/discover");
  if (r.error) return { error: `Beoordelen mislukt: ${r.error}` };
  return { ok: r.scored ? `${r.scored} posts beoordeeld op je strategie.` : "Alles was al beoordeeld." };
}

// ── Een passende post als idee naar Scripts ─────────────────────
export async function postToIdeaAction(postId: string): Promise<ActionResult & { ideaId?: string }> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };

  const { data: p, error } = await auth.supabase
    .from("competitor_posts")
    .select("id,caption,format,permalink,views,fit_angle,competitor_id")
    .eq("id", postId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!p) return { error: "Post niet gevonden." };

  const { data: comp } = await auth.supabase.from("competitors").select("handle").eq("id", p.competitor_id).maybeSingle();
  const handle = (comp?.handle as string) ?? "competitor";
  const caption = String(p.caption ?? "").trim();
  const title = (caption.split(/\n/)[0] || "Idee uit Discover").slice(0, 120);
  const fmt = /short|youtube/i.test(String(p.format)) && /longform/i.test(String(p.format)) ? "Longform" : String(p.format) === "Carrousel" ? "Carrousel" : "Reel";

  const { data: idea, error: insErr } = await auth.supabase
    .from("content_ideas")
    .insert({
      agency_id: auth.agency.id,
      title,
      hook: caption.slice(0, 300) || null,
      angle: p.fit_angle ?? null,
      pillar: null,
      format: fmt,
      source_note: `Discover: ${handle} · ${Number(p.views ?? 0).toLocaleString("nl-NL")} views`,
      source_url: p.permalink ?? null,
      status: "gekozen",
    })
    .select("id")
    .single();
  if (insErr) return { error: insErr.message };

  revalidatePath("/platform/scripts");
  return { ok: "Staat bij Ideeën — pas 'm daar aan naar jouw verhaal.", ideaId: idea.id as string };
}
