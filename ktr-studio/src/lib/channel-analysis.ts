// ════════════════════════════════════════════════════════════════
// Analyse over de eigen kanalen: wat groeit, wat stilstaat, wat je
// deze week moet fixen. Rekent eerst zelf de verschillen uit (7 en
// 30 dagen) en laat de AI alleen duiden — nooit cijfers verzinnen.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, isClaudeConfigured } from "@/lib/ai";

const PROMPT = `Je bent de groeistrateeg van Menno Kater (KTR Studio): hij bouwt YouTube- en
Reels-systemen voor founders en bouwt tegelijk zijn eigen merk (doel: van referrals
naar een stabiele leadflow via zijn eigen kanalen).

Hieronder staan de echte cijfers van zijn eigen kanalen, met de verschillen over
7 en 30 dagen, de best lopende uploads en de laatste check van zijn website.
Schrijf een korte analyse in het Nederlands. Concreet, met de getallen erbij.
Geen algemeenheden. Als iets niet uit de data blijkt, zeg dat.

Gebruik precies deze kopjes:

## Wat werkt
Twee tot vier zinnen. Noem de upload of het kanaal dat het best loopt en waarom
dat waarschijnlijk zo is.

## Wat we moeten fixen
Een lijst van maximaal vijf punten, belangrijkste eerst. Per punt: wat, waarom
(met cijfer) en wat je concreet zou doen. Website-issues horen hier ook bij.

## Deze week
Drie acties, in volgorde, die het meeste opleveren voor de minste moeite.

## Wat we niet weten
Waar de data tekortschiet (te weinig metingen, kanaal niet gekoppeld, geen
websitecijfers) en wat er nodig is om dat op te lossen.`;

interface Row {
  channel: string;
  stat_date: string;
  followers: number | null;
  visitors: number | null;
  views: number | null;
  impressions: number | null;
  videos: number | null;
  likes: number | null;
  comments: number | null;
  avg_views: number | null;
  top_title: string | null;
  top_views: number | null;
  top_url: string | null;
}

const num = (n: number | null | undefined) => (n == null ? "onbekend" : Number(n).toLocaleString("nl-NL"));

function delta(rows: Row[], key: keyof Row, days: number): string {
  const latest = rows[rows.length - 1];
  if (!latest) return "geen data";
  const cutoff = new Date(latest.stat_date);
  cutoff.setDate(cutoff.getDate() - days);
  const iso = cutoff.toISOString().slice(0, 10);
  const older = [...rows].reverse().find((r) => r.stat_date <= iso);
  const a = latest[key] as number | null;
  const b = older?.[key] as number | null | undefined;
  if (a == null) return "onbekend";
  if (older == null || b == null) return `${num(a)} (nog geen ${days} dagen historie)`;
  const d = Number(a) - Number(b);
  const pct = Number(b) > 0 ? ` (${d >= 0 ? "+" : ""}${((d / Number(b)) * 100).toFixed(1)}%)` : "";
  return `${num(a)}, ${d >= 0 ? "+" : ""}${num(d)} in ${days} dagen${pct}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function buildChannelSummary(db: SupabaseClient, agencyId: string): Promise<string> {
  const [{ data: stats }, { data: site }] = await Promise.all([
    db.from("channel_stats").select("channel,stat_date,followers,visitors,views,impressions,videos,likes,comments,avg_views,top_title,top_views,top_url")
      .eq("agency_id", agencyId).order("stat_date", { ascending: true }).limit(600),
    db.from("site_checks").select("url,ok,status,ms,title,description,issues,checked_at")
      .eq("agency_id", agencyId).order("checked_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const byChannel = new Map<string, Row[]>();
  for (const r of (stats ?? []) as Row[]) {
    const arr = byChannel.get(r.channel) ?? [];
    arr.push({ ...r, stat_date: String(r.stat_date).slice(0, 10) });
    byChannel.set(r.channel, arr);
  }

  const blocks: string[] = [];
  const labels: Record<string, string> = { youtube: "YOUTUBE", instagram: "INSTAGRAM", linkedin: "LINKEDIN", website: "WEBSITE (bezoekers)" };
  for (const ch of ["youtube", "instagram", "linkedin", "website"]) {
    const rows = byChannel.get(ch);
    if (!rows?.length) {
      blocks.push(`${labels[ch]}: geen metingen.`);
      continue;
    }
    const latest = rows[rows.length - 1];
    const main = ch === "website" ? "visitors" : "followers";
    const lines = [
      `${labels[ch]} — ${rows.length} metingen, laatste ${latest.stat_date}`,
      `  ${ch === "website" ? "bezoekers" : ch === "youtube" ? "abonnees" : "volgers"}: ${delta(rows, main as keyof Row, 7)} · 30d: ${delta(rows, main as keyof Row, 30)}`,
    ];
    if (latest.views != null) lines.push(`  views (som recente uploads): ${delta(rows, "views", 7)}`);
    if (latest.avg_views != null) lines.push(`  gemiddelde views per recente upload: ${num(latest.avg_views)}`);
    if (latest.videos != null) lines.push(`  totaal uploads op het kanaal: ${num(latest.videos)}`);
    if (latest.likes != null) lines.push(`  likes/reacties over recente uploads: ${num(latest.likes)} / ${num(latest.comments)}`);
    if (latest.top_title) lines.push(`  best lopende recente upload: "${latest.top_title}" — ${num(latest.top_views)} views`);
    if (latest.impressions != null) lines.push(`  impressies: ${num(latest.impressions)}`);
    blocks.push(lines.join("\n"));
  }

  if (site) {
    blocks.push([
      `WEBSITE-CHECK (${String((site as any).checked_at).slice(0, 10)}) — ${(site as any).url}`,
      `  bereikbaar: ${(site as any).ok ? "ja" : "NEE"} · status ${(site as any).status ?? "?"} · ${(site as any).ms} ms`,
      `  titel: ${(site as any).title ?? "(geen)"}`,
      `  omschrijving: ${(site as any).description ?? "(geen)"}`,
      `  issues: ${((site as any).issues as string[] | null)?.length ? ((site as any).issues as string[]).map((i) => `\n    - ${i}`).join("") : "geen"}`,
    ].join("\n"));
  } else {
    blocks.push("WEBSITE-CHECK: nog niet gedraaid (geen eigen website ingevuld).");
  }

  return blocks.join("\n\n");
}

export async function analyzeChannels(db: SupabaseClient, agencyId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isClaudeConfigured()) return { ok: false, error: "ANTHROPIC_API_KEY ontbreekt" };
  const summary = await buildChannelSummary(db, agencyId);
  if (!/metingen, laatste/.test(summary)) return { ok: false, error: "Nog geen metingen — sync eerst je kanalen." };

  const { text, mock } = await generateText({ template: PROMPT, input: summary, model: "smart" });
  if (mock) return { ok: false, error: "AI gaf geen antwoord" };

  const { error } = await db.from("channel_insights").insert({ agency_id: agencyId, body: text, model: "smart" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
