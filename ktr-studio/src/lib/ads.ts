// ════════════════════════════════════════════════════════════════
// Advertenties ophalen uit de database. De berekeningen en types
// staan in ads-shared.ts; die worden hier doorgegeven zodat een
// server component maar één plek hoeft te kennen.
// ════════════════════════════════════════════════════════════════
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import type { AdEntry, AdInsight } from "./ads-shared";

export * from "./ads-shared";

export interface AdData {
  entries: AdEntry[];
  from: string;
  to: string;
  /** Zelfde lengte periode ervóór — voor de "t.o.v. vorige periode"-deltas. */
  previous: AdEntry[];
  insight: AdInsight | null;
  migrationMissing: boolean;
}

export function periodBounds(days: number): { from: string; to: string; prevFrom: string; prevTo: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  const to = new Date(today);
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo) };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): AdEntry {
  return {
    id: r.id,
    date: String(r.date).slice(0, 10),
    platform: r.platform ?? "Anders",
    campaign: r.campaign ?? null,
    adset: r.adset ?? null,
    creative: r.creative ?? null,
    contentId: r.content_id ?? null,
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    spend: Number(r.spend ?? 0),
    results: Number(r.results ?? 0),
    revenue: Number(r.revenue ?? 0),
    clientId: r.client_id ?? null,
    source: r.source ?? "handmatig",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getAdData(days: number, clientId?: string | null): Promise<AdData> {
  const { from, to, prevFrom, prevTo } = periodBounds(days);
  const empty: AdData = { entries: [], previous: [], from, to, insight: null, migrationMissing: false };
  if (DEMO_MODE || !isSupabaseConfigured) return empty;

  const supabase = await createClient();
  if (!supabase) return empty;

  const cols = "id,date,platform,campaign,adset,creative,content_id,impressions,clicks,spend,results,revenue,client_id,source";
  let q = supabase.from("ad_entries").select(cols).gte("date", prevFrom).lte("date", to).order("date");
  if (clientId) q = q.eq("client_id", clientId);

  const [entriesRes, insightRes] = await Promise.all([
    q,
    supabase
      .from("ad_insights")
      .select("id,body,period_start,period_end,created_at,model")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (entriesRes.error) return { ...empty, migrationMissing: true };

  const all = (entriesRes.data ?? []).map(mapRow);
  const insightRow = insightRes.data?.[0];

  return {
    from,
    to,
    entries: all.filter((e: AdEntry) => e.date >= from),
    previous: all.filter((e: AdEntry) => e.date < from),
    migrationMissing: false,
    insight: insightRow
      ? {
          id: insightRow.id as string,
          body: insightRow.body as string,
          periodStart: String(insightRow.period_start).slice(0, 10),
          periodEnd: String(insightRow.period_end).slice(0, 10),
          createdAt: insightRow.created_at as string,
          model: (insightRow.model as string) ?? null,
        }
      : null,
  };
}
