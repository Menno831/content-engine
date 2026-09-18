"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { requireTeam } from "@/lib/guard";
import { analyzeChannels } from "@/lib/channel-analysis";
import { checkSite } from "@/lib/site-check";
import { syncOwnChannelsCore, type ChannelSyncResult } from "@/lib/sync/channels";

export interface ChannelResult {
  ok?: boolean;
  error?: string;
}

const CHANNELS = ["website", "instagram", "linkedin", "youtube"];

export async function saveChannelStatAction(input: {
  channel: string;
  date: string; // YYYY-MM-DD
  followers?: number | null;
  visitors?: number | null;
  views?: number | null;
  impressions?: number | null;
}): Promise<ChannelResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (!CHANNELS.includes(input.channel)) return { error: "Onbekend kanaal." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Kies een datum." };

  // Bigint-kolommen: rond af zodat "12,5" geen rauwe databasefout geeft.
  const clean = (n: number | null | undefined) =>
    n == null || Number.isNaN(n) ? null : Math.round(n);
  const followers = clean(input.followers);
  const visitors = clean(input.visitors);
  const views = clean(input.views);
  const impressions = clean(input.impressions);
  if ([followers, visitors, views, impressions].every((n) => n == null)) {
    return { error: "Vul minstens één cijfer in." };
  }

  const { error } = await supabase.from("channel_stats").upsert(
    {
      agency_id: agency.id,
      channel: input.channel,
      stat_date: input.date,
      followers,
      visitors,
      views,
      impressions,
      source: "handmatig",
    },
    { onConflict: "agency_id,channel,stat_date" }
  );
  if (error) return { error: error.message };

  revalidatePath("/platform/channels");
  return { ok: true };
}

export async function deleteChannelStatAction(id: string): Promise<ChannelResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase.from("channel_stats").delete().eq("id", id).select("id");
  if (error) return { error: "Verwijderen lukte niet. Probeer het opnieuw." };
  if (!data?.length) return { error: "Meting niet gevonden — ververs de pagina." };
  revalidatePath("/platform/channels");
  return { ok: true };
}

export async function saveOwnChannelsAction(igHandle: string, ytChannel: string, website = ""): Promise<ChannelResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("agencies")
    .update({
      own_ig_handle: igHandle.trim().replace(/^@/, "") || null,
      own_yt_channel: ytChannel.trim() || null,
      own_website: website.trim().replace(/\/$/, "") || null,
    })
    .eq("id", ctx.agency.id);
  if (error) return { error: error.message };

  revalidatePath("/platform/channels");
  return { ok: true };
}

export async function syncOwnChannelsAction(): Promise<ChannelResult & { results?: ChannelSyncResult[] }> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };

  const results = await syncOwnChannelsCore(ctx.agency.id);
  revalidatePath("/platform/channels");
  return { ok: true, results };
}


export async function analyzeChannelsAction(): Promise<ChannelResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };
  const r = await analyzeChannels(ctx.supabase, ctx.agency.id);
  if (!r.ok) return { error: r.error ?? "Analyse mislukt." };
  revalidatePath("/platform/channels");
  return { ok: true };
}

export async function checkSiteAction(): Promise<ChannelResult> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };
  const { data: a } = await ctx.supabase.from("agencies").select("own_website").eq("id", ctx.agency.id).maybeSingle();
  const url = (a?.own_website as string) ?? "";
  if (!url) return { error: "Vul eerst je website in en sla op." };
  const c = await checkSite(url);
  const { error } = await ctx.supabase.from("site_checks").insert({
    agency_id: ctx.agency.id, url: c.url, ok: c.ok, status: c.status, ms: c.ms, https: c.https,
    title: c.title, description: c.description, has_viewport: c.hasViewport, has_canonical: c.hasCanonical,
    has_og_image: c.hasOgImage, h1_count: c.h1Count, issues: c.issues,
  });
  if (error) return { error: error.message };
  revalidatePath("/platform/channels");
  return { ok: true };
}
