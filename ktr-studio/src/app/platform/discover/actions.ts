"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/auth";
import { fetchInstagram } from "@/lib/integrations/instagram";

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

  // Eigenaarschap via RLS.
  const { data: comp } = await supabase
    .from("competitors")
    .select("id, handle, agency_id")
    .eq("id", competitorId)
    .maybeSingle();
  if (!comp) return { error: "Onbekende competitor." };

  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." };

  try {
    const result = await fetchInstagram(comp.handle as string);
    for (const m of result.media) {
      await admin.from("competitor_posts").upsert(
        {
          competitor_id: comp.id,
          agency_id: comp.agency_id,
          external_id: m.externalId,
          caption: m.caption.slice(0, 300),
          format: m.type,
          permalink: m.permalink,
          views: m.views,
          likes: m.likes,
          comments: m.comments,
          posted_at: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
          fetched_at: result.fetchedAt,
        },
        { onConflict: "competitor_id,external_id" }
      );
    }
    await admin
      .from("competitors")
      .update({
        name: result.profile.fullName || null,
        followers: result.profile.followers || null,
        last_synced_at: result.fetchedAt,
      })
      .eq("id", comp.id);

    revalidatePath("/platform/discover");
    return { ok: `${comp.handle}: ${result.media.length} posts gesynct.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync mislukt";
    return { error: msg === "not_configured" ? "RAPIDAPI_KEY ontbreekt (Instagram-bron)." : msg };
  }
}
