// ════════════════════════════════════════════════════════════════
// Content-ideeën ophalen uit de database. Types, kleuren en de
// scriptstructuur staan in ideas-shared.ts en worden hier doorgegeven.
// ════════════════════════════════════════════════════════════════
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import type { ContentIdea, IdeaSource } from "./ideas-shared";

export * from "./ideas-shared";

export interface IdeasData {
  ideas: ContentIdea[];
  sources: IdeaSource[];
  migrationMissing: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getIdeas(): Promise<IdeasData> {
  const empty: IdeasData = { ideas: [], sources: [], migrationMissing: false };
  if (DEMO_MODE || !isSupabaseConfigured) return empty;

  const supabase = await createClient();
  if (!supabase) return empty;

  const [ideasRes, sourcesRes] = await Promise.all([
    supabase
      .from("content_ideas")
      .select("id,title,hook,angle,pillar,format,status,source_id,source_note,source_url,script_id,client_id,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("idea_sources")
      .select("id,kind,title,happened_on,url,created_at")
      .order("happened_on", { ascending: false }),
  ]);

  if (ideasRes.error) return { ...empty, migrationMissing: true };

  return {
    migrationMissing: false,
    ideas: (ideasRes.data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      hook: r.hook ?? null,
      angle: r.angle ?? null,
      pillar: r.pillar ?? null,
      format: r.format ?? null,
      status: r.status ?? "nieuw",
      sourceId: r.source_id ?? null,
      sourceNote: r.source_note ?? null,
      sourceUrl: r.source_url ?? null,
      scriptId: r.script_id ?? null,
      clientId: r.client_id ?? null,
      createdAt: r.created_at,
    })),
    sources: (sourcesRes.data ?? []).map((r: any) => ({
      id: r.id,
      kind: r.kind ?? "call",
      title: r.title,
      happenedOn: r.happened_on ? String(r.happened_on).slice(0, 10) : null,
      url: r.url ?? null,
      createdAt: r.created_at,
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

