// ═══════════════════════════════════════════════════════════
// Meta Ads Insights. Leest live uit het advertentieaccount:
// account-totaal, per campagne, per advertentieset, per advertentie,
// plus de uitsplitsingen die echt iets veranderen aan een beslissing
// (plaatsing, leeftijd, geslacht) en de dagcurve.
//
// Bewust zonder opslag: cijfers bij Meta lopen nog dagen na, dus een
// kopie in onze database is binnen een dag onjuist. We halen ze op met
// een korte cache en tonen wat Meta op dit moment zegt.
// ═══════════════════════════════════════════════════════════

const VERSION = "v21.0";

export const isMetaAdsConfigured = Boolean(
  process.env.META_ADS_TOKEN && process.env.META_AD_ACCOUNT_ID
);

export type Preset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "maximum";

export interface AdRow {
  level: "account" | "campaign" | "adset" | "ad";
  id: string;
  name: string;
  status?: string | null;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctr: number;          // link-CTR in procenten
  cpc: number;          // kosten per linkklik
  cpm: number;
  landingViews: number;
  leads: number;
  costPerLead: number | null;
  thruPlays: number;
  videoP50: number;     // kijkers die de helft haalden
  parentId?: string | null;
}

export interface Breakdown {
  key: string;
  spend: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  leads: number;
}

export interface DayPoint {
  date: string;
  spend: number;
  linkClicks: number;
  landingViews: number;
  leads: number;
}

export interface MetaAdsSnapshot {
  configured: boolean;
  error?: string;
  currency: string;
  accountName: string;
  preset: Preset;
  account: AdRow | null;
  campaigns: AdRow[];
  adsets: AdRow[];
  ads: AdRow[];
  placements: Breakdown[];
  ages: Breakdown[];
  genders: Breakdown[];
  days: DayPoint[];
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// Meta levert resultaten als een lijst {action_type, value}. We pikken er
// de acties uit die voor ons iets betekenen en tellen de rest niet mee.
function action(list: unknown, ...types: string[]): number {
  if (!Array.isArray(list)) return 0;
  let total = 0;
  for (const a of list as Array<Record<string, unknown>>) {
    if (types.includes(String(a.action_type))) total += n(a.value);
  }
  return total;
}

const LEAD_ACTIONS = [
  "lead",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.lead_grouped",
];

function toRow(level: AdRow["level"], r: Record<string, unknown>): AdRow {
  const spend = n(r.spend);
  const linkClicks = action(r.actions, "link_click");
  const landingViews = action(r.actions, "landing_page_view");
  const leads = action(r.actions, ...LEAD_ACTIONS);
  const impressions = n(r.impressions);
  return {
    level,
    id: String(r[`${level}_id`] ?? r.account_id ?? ""),
    name: String(r[`${level}_name`] ?? r.account_name ?? ""),
    status: (r.effective_status as string) ?? null,
    spend,
    impressions,
    reach: n(r.reach),
    frequency: n(r.frequency),
    clicks: n(r.clicks),
    linkClicks,
    ctr: linkClicks && impressions ? (linkClicks / impressions) * 100 : 0,
    cpc: linkClicks ? spend / linkClicks : 0,
    cpm: impressions ? (spend / impressions) * 1000 : 0,
    landingViews,
    leads,
    costPerLead: leads ? spend / leads : null,
    thruPlays: action(r.actions, "video_thruplay_watched_actions", "video_view"),
    videoP50: n(
      Array.isArray(r.video_p50_watched_actions)
        ? (r.video_p50_watched_actions as Array<Record<string, unknown>>)[0]?.value
        : 0
    ),
    parentId:
      level === "ad"
        ? String(r.adset_id ?? "")
        : level === "adset"
        ? String(r.campaign_id ?? "")
        : null,
  };
}

function toBreakdown(r: Record<string, unknown>, field: string): Breakdown {
  const linkClicks = action(r.actions, "link_click");
  const impressions = n(r.impressions);
  return {
    key: String(r[field] ?? "onbekend"),
    spend: n(r.spend),
    impressions,
    clicks: n(r.clicks),
    linkClicks,
    ctr: linkClicks && impressions ? (linkClicks / impressions) * 100 : 0,
    leads: action(r.actions, ...LEAD_ACTIONS),
  };
}

const FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "actions",
  "video_p50_watched_actions",
  "account_name",
  "account_currency",
].join(",");

async function insights(
  account: string,
  token: string,
  params: Record<string, string>
): Promise<Array<Record<string, unknown>>> {
  const q = new URLSearchParams({ access_token: token, limit: "200", ...params });
  const url = `https://graph.facebook.com/${VERSION}/${account}/insights?${q}`;
  // 10 minuten cache: vaak genoeg voor een dashboard, en het spaart de
  // rate limit van het advertentieaccount.
  const res = await fetch(url, { next: { revalidate: 600 } });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = (json.error as Record<string, unknown>) ?? {};
    throw new Error(String(err.message ?? `Meta gaf ${res.status}`));
  }
  return (json.data as Array<Record<string, unknown>>) ?? [];
}

export async function getMetaAds(preset: Preset = "last_7d"): Promise<MetaAdsSnapshot> {
  const empty: MetaAdsSnapshot = {
    configured: false,
    currency: "EUR",
    accountName: "",
    preset,
    account: null,
    campaigns: [],
    adsets: [],
    ads: [],
    placements: [],
    ages: [],
    genders: [],
    days: [],
  };
  const token = process.env.META_ADS_TOKEN;
  const raw = process.env.META_AD_ACCOUNT_ID;
  if (!token || !raw) return empty;
  const account = raw.startsWith("act_") ? raw : `act_${raw}`;
  const base = { date_preset: preset, fields: FIELDS };

  try {
    const [acc, campaigns, adsets, ads, placements, ages, genders, days] =
      await Promise.all([
        insights(account, token, base),
        insights(account, token, { ...base, level: "campaign" }),
        insights(account, token, { ...base, level: "adset" }),
        insights(account, token, { ...base, level: "ad" }),
        insights(account, token, { ...base, breakdowns: "publisher_platform,platform_position" }),
        insights(account, token, { ...base, breakdowns: "age" }),
        insights(account, token, { ...base, breakdowns: "gender" }),
        insights(account, token, { ...base, time_increment: "1" }),
      ]);

    const first = acc[0] ?? {};
    return {
      configured: true,
      currency: String(first.account_currency ?? "EUR"),
      accountName: String(first.account_name ?? account),
      preset,
      account: acc.length ? toRow("account", first) : null,
      campaigns: campaigns.map((r) => toRow("campaign", r)).sort((a, b) => b.spend - a.spend),
      adsets: adsets.map((r) => toRow("adset", r)).sort((a, b) => b.spend - a.spend),
      ads: ads.map((r) => toRow("ad", r)).sort((a, b) => b.spend - a.spend),
      placements: placements
        .map((r) => ({
          ...toBreakdown(r, "platform_position"),
          key: `${r.publisher_platform ?? "?"} · ${r.platform_position ?? "?"}`,
        }))
        .sort((a, b) => b.spend - a.spend),
      ages: ages.map((r) => toBreakdown(r, "age")).sort((a, b) => a.key.localeCompare(b.key)),
      genders: genders.map((r) => toBreakdown(r, "gender")).sort((a, b) => b.spend - a.spend),
      days: days
        .map((r) => ({
          date: String(r.date_start ?? ""),
          spend: n(r.spend),
          linkClicks: action(r.actions, "link_click"),
          landingViews: action(r.actions, "landing_page_view"),
          leads: action(r.actions, ...LEAD_ACTIONS),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  } catch (e) {
    return { ...empty, configured: true, error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}
