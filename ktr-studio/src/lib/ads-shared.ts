// ════════════════════════════════════════════════════════════════
// Advertenties: types, kleuren en doorrekenen. Bewust zonder server-
// imports, zodat de schermen (client components) deze ook mogen laden. Alle afgeleide cijfers
// (CTR, CPM, CPC, CPL, ROAS) worden hier berekend en nergens
// opgeslagen — zo kan één regel nooit uit de pas lopen met de rest.
//
// Deelt een deler nooit op nul: waar geen basis is, is het cijfer
// null en toont de UI een streepje in plaats van een 0 die niets zegt.
// ════════════════════════════════════════════════════════════════

export interface AdEntry {
  id: string;
  date: string; // YYYY-MM-DD
  platform: string;
  campaign: string | null;
  adset: string | null;
  creative: string | null;
  contentId: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  results: number;
  revenue: number;
  clientId: string | null;
  source: string;
}

/** Opgetelde cijfers plus alles wat je daaruit kunt afleiden. */
export interface AdTotals {
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  revenue: number;
  ctr: number | null;   // % klikken op vertoningen
  cpm: number | null;   // kosten per 1.000 vertoningen
  cpc: number | null;   // kosten per klik
  cpl: number | null;   // kosten per resultaat/lead
  roas: number | null;  // omzet gedeeld door uitgaven
}

export interface AdGroup extends AdTotals {
  key: string;
  entries: number;
}

export interface AdDay extends AdTotals {
  date: string;
}

export const PLATFORMS = ["Meta", "YouTube", "TikTok", "Google"] as const;

// Vaste kleurtoewijzing per platform: de kleur volgt het platform, niet
// z'n plek in een lijst — een filter mag de overblijvers nooit hertekenen.
// Reeks gevalideerd op onderscheid bij kleurenblindheid (dark surface).
export const PLATFORM_COLOR: Record<string, string> = {
  Meta: "#DE5F0A",
  YouTube: "#3B82F6",
  TikTok: "#0F9E6E",
  Google: "#8B5CF6",
  Anders: "#8A8F98",
};

export function colorFor(platform: string): string {
  return PLATFORM_COLOR[platform] ?? PLATFORM_COLOR.Anders;
}

function derive(base: {
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  revenue: number;
}): AdTotals {
  const { spend, impressions, clicks, results, revenue } = base;
  return {
    spend,
    impressions,
    clicks,
    results,
    revenue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpl: results > 0 ? spend / results : null,
    roas: spend > 0 && revenue > 0 ? revenue / spend : null,
  };
}

export function totalsOf(entries: AdEntry[]): AdTotals {
  return derive(
    entries.reduce(
      (acc, e) => ({
        spend: acc.spend + e.spend,
        impressions: acc.impressions + e.impressions,
        clicks: acc.clicks + e.clicks,
        results: acc.results + e.results,
        revenue: acc.revenue + e.revenue,
      }),
      { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 }
    )
  );
}

/** Groepeer op een veld (platform, campagne, creative…) en reken door. */
export function groupBy(entries: AdEntry[], pick: (e: AdEntry) => string | null): AdGroup[] {
  const buckets = new Map<string, AdEntry[]>();
  for (const e of entries) {
    const key = (pick(e) || "").trim() || "Zonder naam";
    const arr = buckets.get(key);
    if (arr) arr.push(e);
    else buckets.set(key, [e]);
  }
  return [...buckets.entries()]
    .map(([key, list]) => ({ key, entries: list.length, ...totalsOf(list) }))
    .sort((a, b) => b.spend - a.spend);
}

/** Eén rij per dag in de periode — ook dagen zonder uitgaven, zodat de
 *  grafiek geen gaten dichttrekt die er in het echt wel zijn. */
export function byDay(entries: AdEntry[], from: string, to: string): AdDay[] {
  const buckets = new Map<string, AdEntry[]>();
  for (const e of entries) {
    const arr = buckets.get(e.date);
    if (arr) arr.push(e);
    else buckets.set(e.date, [e]);
  }
  const days: AdDay[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    days.push({ date: iso, ...totalsOf(buckets.get(iso) ?? []) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export interface AdInsight {
  id: string;
  body: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  model: string | null;
}

export interface AdInsight {
  id: string;
  body: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  model: string | null;
}
