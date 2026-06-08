"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface CaptureResult {
  error?: string;
  ok?: string;
}

export async function createCaptureAction(_prev: CaptureResult, formData: FormData): Promise<CaptureResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Titel is verplicht." };

  const { error } = await supabase.from("captures").insert({
    agency_id: agency.id,
    board: String(formData.get("board") ?? "").trim() || "Swipe file",
    kind: String(formData.get("kind") ?? "link"),
    title,
    url: String(formData.get("url") ?? "").trim() || null,
    body: String(formData.get("body") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/boards");
  return { ok: "Toegevoegd." };
}

// Bewaar een Discover-item op een board.
export async function saveToBoardAction(item: { title: string; url?: string; source?: string }, board: string): Promise<CaptureResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };

  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden." };

  const { error } = await supabase.from("captures").insert({
    agency_id: agency.id,
    board: board || "Swipe file",
    kind: "swipe",
    title: item.title,
    url: item.url ?? null,
    source: item.source ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/boards");
  return { ok: "Bewaard op board." };
}
