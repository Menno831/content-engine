"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

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

  const nums = [input.followers, input.visitors, input.views, input.impressions];
  if (nums.every((n) => n == null)) return { error: "Vul minstens één cijfer in." };

  const { error } = await supabase.from("channel_stats").upsert(
    {
      agency_id: agency.id,
      channel: input.channel,
      stat_date: input.date,
      followers: input.followers ?? null,
      visitors: input.visitors ?? null,
      views: input.views ?? null,
      impressions: input.impressions ?? null,
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
  const { error } = await supabase.from("channel_stats").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/channels");
  return { ok: true };
}
