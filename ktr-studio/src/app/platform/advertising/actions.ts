"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/guard";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { parseAdCsv } from "@/lib/ads-csv";
import { getAdData, totalsOf, groupBy, periodBounds } from "@/lib/ads";

export interface AdResult {
  ok?: boolean;
  error?: string;
  message?: string;
}

// ── Handmatig één regel toevoegen ───────────────────────────────
export async function addAdEntryAction(input: {
  date: string;
  platform: string;
  campaign: string;
  adset: string;
  creative: string;
  clientId: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  results: number;
  revenue: number;
}): Promise<AdResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Kies een datum." };

  const { error } = await auth.supabase.from("ad_entries").insert({
    agency_id: auth.agency.id,
    client_id: input.clientId,
    date: input.date,
    platform: input.platform || "Meta",
    campaign: input.campaign.trim() || null,
    adset: input.adset.trim() || null,
    creative: input.creative.trim() || null,
    impressions: Math.max(0, Math.round(input.impressions || 0)),
    clicks: Math.max(0, Math.round(input.clicks || 0)),
    spend: Number(input.spend) || 0,
    results: Math.max(0, Math.round(input.results || 0)),
    revenue: Number(input.revenue) || 0,
    source: "handmatig",
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/advertising");
  return { ok: true, message: "Regel toegevoegd." };
}

export async function deleteAdEntryAction(id: string): Promise<AdResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("ad_entries").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/advertising");
  return { ok: true };
}

// ── Import vanuit een CSV-export ────────────────────────────────
export async function importAdCsvAction(input: {
  csv: string;
  platform: string;
  clientId: string | null;
}): Promise<AdResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };

  const report = parseAdCsv(input.csv);
  if (report.error) return { error: report.error };
  if (report.rows.length === 0) return { error: "Geen bruikbare regels gevonden." };

  const platform = input.platform || "Meta";
  const rows = report.rows.map((r) => ({
    agency_id: auth.agency.id,
    client_id: input.clientId,
    date: r.date,
    platform,
    campaign: r.campaign,
    adset: r.adset,
    creative: r.creative,
    impressions: r.impressions,
    clicks: r.clicks,
    spend: r.spend,
    results: r.results,
    revenue: r.revenue,
    source: "csv",
    // Zonder id uit het platform bouwen we er zelf een uit de sleutelvelden,
    // zodat dezelfde export twee keer importeren niets dubbel zet.
    external_id:
      r.externalId ??
      [platform, r.date, r.campaign ?? "", r.adset ?? "", r.creative ?? ""].join("|").slice(0, 300),
  }));

  // In blokken: een grote export in één keer is een zware query.
  let saved = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await auth.supabase
      .from("ad_entries")
      .upsert(chunk, { onConflict: "agency_id,external_id", ignoreDuplicates: false });
    if (error) return { error: `${error.message} (na ${saved} regels)` };
    saved += chunk.length;
  }

  revalidatePath("/platform/advertising");
  return {
    ok: true,
    message: `${saved} regels ingelezen${report.skipped ? ` · ${report.skipped} overgeslagen (leeg of zonder datum)` : ""}.`,
  };
}

// ── AI-analyse over de periode ──────────────────────────────────
const ANALYSE_PROMPT = `Je bent de media-buyer van een Nederlands content-agency (Reels en YouTube voor founders).
Hieronder staan de echte advertentiecijfers van een periode, plus dezelfde periode ervoor.

Schrijf een analyse in het Nederlands voor de eigenaar. Wees concreet en noem namen en getallen
uit de data. Geen algemeenheden, geen marketingtaal, geen aannames over dingen die er niet staan.

Houd deze indeling aan, met deze exacte kopjes:

## Wat opvalt
Drie tot vijf zinnen over hoe de periode liep vergeleken met de vorige. Benoem de belangrijkste
verschuiving en waar die vandaan komt.

## Zet meer op
Welke campagnes of advertenties verdienen meer budget, en waarom (noem het cijfer waarop je dat baseert).

## Zet uit of pas aan
Wat kost geld zonder resultaat. Noem per punt wat je concreet zou doen.

## Wat ik zou testen
Twee of drie tests die logisch volgen uit deze cijfers.

## Waar de data tekortschiet
Wat je niet kunt beoordelen omdat het ontbreekt (bijvoorbeeld: geen omzet ingevuld, te weinig dagen,
of resultaten die niet zijn doorgegeven). Wees hier eerlijk in — liever een lege conclusie dan een gokje.

Regels: gebruik euro's met een €-teken, rond bedragen af op hele euro's, schrijf percentages met één
decimaal. Als een cijfer ontbreekt, zeg dat, verzin het niet.`;

function money(n: number): string {
  return `€${Math.round(n).toLocaleString("nl-NL")}`;
}

function line(label: string, t: ReturnType<typeof totalsOf>): string {
  return [
    `${label}: uitgaven ${money(t.spend)}`,
    `vertoningen ${t.impressions.toLocaleString("nl-NL")}`,
    `klikken ${t.clicks.toLocaleString("nl-NL")}`,
    `CTR ${t.ctr === null ? "onbekend" : `${t.ctr.toFixed(1)}%`}`,
    `CPM ${t.cpm === null ? "onbekend" : money(t.cpm)}`,
    `resultaten ${t.results}`,
    `kosten per resultaat ${t.cpl === null ? "onbekend" : money(t.cpl)}`,
    `omzet ${t.revenue > 0 ? money(t.revenue) : "niet ingevuld"}`,
    `ROAS ${t.roas === null ? "onbekend" : `${t.roas.toFixed(2)}x`}`,
  ].join(" · ");
}

export async function generateAdInsightAction(days: number, clientId: string | null): Promise<AdResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!isClaudeConfigured()) return { error: "ANTHROPIC_API_KEY ontbreekt — zet 'm in Vercel." };

  const data = await getAdData(days, clientId);
  if (data.entries.length === 0) return { error: "Nog geen advertentiedata in deze periode." };

  const { from, to, prevFrom, prevTo } = periodBounds(days);
  const now = totalsOf(data.entries);
  const before = totalsOf(data.previous);

  const blocks = [
    `PERIODE ${from} t/m ${to} (${days} dagen)`,
    line("Totaal deze periode", now),
    data.previous.length
      ? line(`Vorige periode (${prevFrom} t/m ${prevTo})`, before)
      : "Vorige periode: geen data beschikbaar.",
    "",
    "PER PLATFORM",
    ...groupBy(data.entries, (e) => e.platform).map((g) => line(g.key, g)),
    "",
    "PER CAMPAGNE",
    ...groupBy(data.entries, (e) => e.campaign)
      .slice(0, 15)
      .map((g) => line(g.key, g)),
    "",
    "PER ADVERTENTIE (creative)",
    ...groupBy(data.entries, (e) => e.creative)
      .slice(0, 15)
      .map((g) => line(g.key, g)),
  ];

  const { text, mock } = await generateText({
    template: ANALYSE_PROMPT,
    input: blocks.join("\n"),
    model: "smart",
  });
  if (mock) return { error: "AI gaf geen antwoord — controleer ANTHROPIC_API_KEY en het tegoed." };

  const { error } = await auth.supabase.from("ad_insights").insert({
    agency_id: auth.agency.id,
    client_id: clientId,
    period_start: from,
    period_end: to,
    body: text,
    model: "smart",
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/advertising");
  return { ok: true, message: "Analyse klaar." };
}
