"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
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
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { profile } = await getSessionContext();
  if (profile?.role !== "owner" && profile?.role !== "team") return { error: "Alleen het team kan metingen verwijderen." };
  const { data, error } = await supabase.from("channel_stats").delete().eq("id", id).select("id");
  if (error) return { error: "Verwijderen lukte niet. Probeer het opnieuw." };
  if (!data?.length) return { error: "Meting niet gevonden — ververs de pagina." };
  revalidatePath("/platform/channels");
  return { ok: true };
}

export async function saveOwnChannelsAction(igHandle: string, ytChannel: string): Promise<ChannelResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (profile?.role !== "owner" && profile?.role !== "team") return { error: "Alleen het team kan bronnen instellen." };

  const { error } = await supabase
    .from("agencies")
    .update({
      own_ig_handle: igHandle.trim().replace(/^@/, "") || null,
      own_yt_channel: ytChannel.trim() || null,
    })
    .eq("id", agency.id);
  if (error) return { error: error.message };

  revalidatePath("/platform/channels");
  return { ok: true };
}

export async function syncOwnChannelsAction(): Promise<ChannelResult & { results?: ChannelSyncResult[] }> {
  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (profile?.role !== "owner" && profile?.role !== "team") return { error: "Alleen het team kan syncen." };

  const results = await syncOwnChannelsCore(agency.id);
  revalidatePath("/platform/channels");
  return { ok: true, results };
}
