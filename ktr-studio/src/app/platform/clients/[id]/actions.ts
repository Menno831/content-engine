"use server";

// Acties van het klant-werkstation: links, stories, calls en health.
// Alles loopt via RLS op de ingelogde agency.

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface Result {
  ok?: boolean;
  error?: string;
}

async function ctx() {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." as const };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." as const };
  return { supabase, agency };
}

// ── Links ───────────────────────────────────────────────────────

export async function addClientLinkAction(clientId: string, label: string, url: string, category: string): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  if (!label.trim() || !url.trim()) return { error: "Naam en link zijn verplicht." };

  const { error } = await c.supabase.from("client_links").insert({
    agency_id: c.agency.id,
    client_id: clientId,
    label: label.trim(),
    url: url.trim(),
    category: category.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/links`);
  return { ok: true };
}

export async function deleteClientLinkAction(clientId: string, id: string): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  const { error } = await c.supabase.from("client_links").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/links`);
  return { ok: true };
}

// ── Stories ─────────────────────────────────────────────────────

export async function addStoryDayAction(clientId: string, date: string): Promise<Result & { id?: string }> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };

  const { data, error } = await c.supabase
    .from("story_sequences")
    .insert({ agency_id: c.agency.id, client_id: clientId, seq_date: date })
    .select("id")
    .single();
  if (error) {
    return { error: /duplicate|unique/i.test(error.message) ? "Voor deze dag staat al een reeks." : error.message };
  }
  revalidatePath(`/platform/clients/${clientId}/stories`);
  return { ok: true, id: data?.id };
}

export async function addStorySlideAction(clientId: string, sequenceId: string, position: number): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  const { error } = await c.supabase.from("story_slides").insert({
    agency_id: c.agency.id,
    sequence_id: sequenceId,
    position,
  });
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/stories`);
  return { ok: true };
}

export async function updateStorySlideAction(
  clientId: string,
  slideId: string,
  patch: { slide_type?: string; cta?: string; views?: number; link_clicks?: number; replies?: number; likes?: number; note?: string }
): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };

  const update: Record<string, unknown> = {};
  if (patch.slide_type !== undefined) update.slide_type = patch.slide_type.trim() || null;
  if (patch.cta !== undefined) update.cta = patch.cta.trim() || null;
  if (patch.note !== undefined) update.note = patch.note.trim() || null;
  for (const k of ["views", "link_clicks", "replies", "likes"] as const) {
    if (patch[k] !== undefined) update[k] = Number(patch[k]) || 0;
  }

  const { error } = await c.supabase.from("story_slides").update(update).eq("id", slideId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/stories`);
  return { ok: true };
}

export async function deleteStorySlideAction(clientId: string, slideId: string): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  const { error } = await c.supabase.from("story_slides").delete().eq("id", slideId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/stories`);
  return { ok: true };
}

export async function deleteStoryDayAction(clientId: string, sequenceId: string): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  const { error } = await c.supabase.from("story_sequences").delete().eq("id", sequenceId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/stories`);
  return { ok: true };
}

// ── Health & beheer ─────────────────────────────────────────────

export async function updateClientHealthAction(
  clientId: string,
  patch: { health?: string; health_note?: string; manager?: string; hidden?: boolean; status?: string }
): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };

  const update: Record<string, unknown> = {};
  if (patch.health !== undefined) update.health = patch.health || null;
  if (patch.health_note !== undefined) update.health_note = patch.health_note.trim() || null;
  if (patch.manager !== undefined) update.manager = patch.manager.trim() || null;
  if (patch.hidden !== undefined) update.hidden = patch.hidden;
  if (patch.status !== undefined) update.status = patch.status;

  const { error } = await c.supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { error: error.message };
  revalidatePath(`/platform/clients/${clientId}/health`);
  revalidatePath("/platform/clients");
  return { ok: true };
}

// ── Calls / meetings ────────────────────────────────────────────

export async function addMeetingAction(input: {
  clientId: string | null;
  title: string;
  startsAt: string;
  duration: number;
  attendees?: string;
  notes?: string;
}): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  if (!input.title.trim()) return { error: "Titel is verplicht." };
  if (!input.startsAt) return { error: "Kies datum en tijd." };

  const { error } = await c.supabase.from("meetings").insert({
    agency_id: c.agency.id,
    client_id: input.clientId,
    title: input.title.trim(),
    starts_at: new Date(input.startsAt).toISOString(),
    duration: Number(input.duration) || 30,
    attendees: input.attendees?.trim() || null,
    notes: input.notes?.trim() || null,
    outcome: "gepland",
  });
  if (error) return { error: error.message };
  revalidatePath("/platform/agenda");
  revalidatePath("/platform");
  if (input.clientId) revalidatePath(`/platform/clients/${input.clientId}/calls`);
  return { ok: true };
}

export async function updateMeetingAction(id: string, patch: { outcome?: string; notes?: string }): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  const update: Record<string, unknown> = {};
  if (patch.outcome !== undefined) update.outcome = patch.outcome;
  if (patch.notes !== undefined) update.notes = patch.notes.trim() || null;

  const { error } = await c.supabase.from("meetings").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/agenda");
  return { ok: true };
}

export async function deleteMeetingAction(id: string): Promise<Result> {
  const c = await ctx();
  if ("error" in c) return { error: c.error };
  const { error } = await c.supabase.from("meetings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/agenda");
  return { ok: true };
}

// ── EOD ─────────────────────────────────────────────────────────

export async function submitEodAction(input: {
  done: string;
  blockers: string;
  tomorrow: string;
  videos: number;
}): Promise<Result> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency, profile, user } = await getSessionContext();
  if (!agency || !user) return { error: "Geen agency — log opnieuw in." };
  if (!input.done.trim()) return { error: "Vul in wat je vandaag hebt gedaan." };

  const { error } = await supabase.from("eod_reports").upsert(
    {
      agency_id: agency.id,
      user_id: user.id,
      full_name: profile?.full_name ?? null,
      eod_date: new Date().toISOString().slice(0, 10),
      done: input.done.trim(),
      blockers: input.blockers.trim() || null,
      tomorrow: input.tomorrow.trim() || null,
      videos: Number(input.videos) || 0,
    },
    { onConflict: "user_id,eod_date" }
  );
  if (error) return { error: error.message };

  revalidatePath("/platform/eod");
  revalidatePath("/platform");
  return { ok: true };
}
