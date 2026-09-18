// ════════════════════════════════════════════════════════════════
// Prospect-kwalificatie: is dit iemand waar we echt iets voor
// kunnen betekenen — én die ons kan betalen?
//
// Twee poorten:
// 1. DOELGROEP — past deze persoon bij Menno's ICP (zie MENNO_ICP):
//    bewezen bedrijf, maakt al content, YouTube ligt nog. Score 0-100.
// 2. NIET AL TE GOED — draait hun YouTube al top (hoge gemiddelde
//    views), dan valt er weinig te fixen en is de pitch zwak.
// ════════════════════════════════════════════════════════════════
import { generateText } from "@/lib/ai";
import { channelParam } from "@/lib/sync/ig-fill";

const YT_KEY = process.env.YOUTUBE_API_KEY ?? "";

// Gemiddeld ≥ 20K views over de laatste uploads = loopt al sterk.
const STRONG_AVG_VIEWS = 20_000;

export interface ChannelSnapshot {
  subs: number;
  avgViews: number;
  videos: number;
  description: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getChannelSnapshot(youtube: string): Promise<ChannelSnapshot | null> {
  if (!YT_KEY) return null;
  const p = channelParam(youtube);
  if (!p) return null;

  const ch = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${p.key}=${encodeURIComponent(p.value)}&key=${YT_KEY}`,
    { next: { revalidate: 86_400 } }
  ).then((r) => (r.ok ? r.json() : null));
  const c = ch?.items?.[0];
  if (!c) return null;

  // Laatste ~10 uploads → gemiddelde views (de eerlijkste "loopt het al"-meter).
  let avgViews = 0;
  const uploads = c.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    const items = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=10&key=${YT_KEY}`,
      { next: { revalidate: 86_400 } }
    ).then((r) => (r.ok ? r.json() : null));
    const ids = (items?.items ?? []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
    if (ids.length) {
      const vids = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}&key=${YT_KEY}`,
        { next: { revalidate: 86_400 } }
      ).then((r) => (r.ok ? r.json() : null));
      const views = (vids?.items ?? []).map((v: any) => Number(v.statistics?.viewCount ?? 0));
      if (views.length) avgViews = Math.round(views.reduce((s: number, v: number) => s + v, 0) / views.length);
    }
  }

  return {
    subs: Number(c.statistics?.subscriberCount ?? 0),
    avgViews,
    videos: Number(c.statistics?.videoCount ?? 0),
    description: String(c.snippet?.description ?? "").slice(0, 800),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Menno's doelgroep, in zijn eigen woorden (intakecall met Seth, juli 2026) ──
// "Founders die meer dan 20K winst per maand draaien, al content maken
// (van nul naar vier YouTube-video's per maand is een te grote stap) en
// het liefst een high-ticket aanbod hebben. 80% van mijn klanten zijn
// coaches, vooral e-com coaches; daarnaast founders in het algemeen."
// Het aanbod: YouTube als extra leadkanaal naast Instagram, €4K/mnd.
export const MENNO_ICP = `WIE WEL
- Founder of coach in NL/BE met een bewezen bedrijf: aannemelijk >€20.000 winst per maand
  (cursussen/coaching van €3K-€10K, team, jaren actief, awards, grote community, bekend merk).
- Maakt al content: actief Instagram-account (reels, ≥ ~2.000 volgers), podcast of YouTube.
- YouTube ligt nog (bijna) leeg, loopt inconsistent of ziet er amateuristisch uit — daar zit de winst.
- Kern: e-commerce-coaches en -educators, businesscoaches/mentoren met bewezen omzet, vastgoed- en
  beleggingseducators met echte programma's, founders van bekende merken (founder-led documentaire).

WIE NIET
- Kleine accounts (< ~1.500 volgers) of mensen die nog geen content maken: de stap is te groot.
- Concurrenten of aangrenzend vak: video-/content-/personal-branding-/zichtbaarheidsbureaus en -coaches.
- Trading-signalen, forex, crypto-communities zonder gezicht: reputatierisico en YouTube vaak al vol.
- Dating/relaties, fitness/PT en gezondheidscoaches als hoofdaanbod: niet onze wereld, geen cases.
- YouTube draait al sterk (>20K gemiddelde views): weinig te fixen.
- Merk-/communityaccounts zonder herkenbare founder, of namen zonder werkende handle.`;

const ICP_TEMPLATE = `Je beoordeelt of een prospect past bij de doelgroep van KTR Studio (YouTube-groei voor founders, €4.000 per maand).

DOELGROEP
{{onderwerp}}

Geef een score 0-100:
- 80-100: klassieke match (bewezen bedrijf, maakt al content, YouTube ligt nog)
- 65-79: past, met één kanttekening
- 50-64: twijfel (te klein, aanbod onduidelijk, niche aan de rand)
- 0-49: past niet
Wees streng: twijfel is geen 65+. Antwoord ALLEEN met JSON, niets eromheen:
{"score":<0-100>,"reden":"<max 15 woorden, Nederlands, concreet>"}

PROSPECT:
`;

export interface FitVerdict {
  // ≥65 = goed, 50-64 = twijfel, <50 = geen_fit. Twijfel gaat er ook uit
  // (regel van Menno), maar de score blijft staan om later te herzien.
  // "onbekend" = technische storing (AI niet bereikbaar) — later opnieuw
  // proberen, nooit op basis daarvan afkeuren.
  verdict: "goed" | "twijfel" | "geen_fit" | "al_sterk" | "onbekend";
  score: number | null;
  reason: string;
}

export const ICP_KEEP_SCORE = 65;

export async function qualifyProspect(p: {
  name: string;
  instagram?: string | null;
  youtube?: string | null;
  weakness?: string | null;
  note?: string | null;
}): Promise<FitVerdict> {
  // Poort 2 eerst (goedkoop en hard): loopt YouTube al te goed?
  let snapshot: ChannelSnapshot | null = null;
  if (p.youtube) snapshot = await getChannelSnapshot(p.youtube).catch(() => null);
  if (snapshot && snapshot.avgViews >= STRONG_AVG_VIEWS) {
    return {
      verdict: "al_sterk",
      score: 20,
      reason: `YouTube loopt al sterk (~${Math.round(snapshot.avgViews / 1000)}K gem. views) — weinig te fixen`,
    };
  }

  // Poort 1: past de persoon bij de doelgroep (AI-score op alle context).
  const input = [
    `Naam: ${p.name}`,
    p.instagram ? `Instagram: ${p.instagram}` : null,
    p.youtube ? `YouTube: ${p.youtube}` : null,
    snapshot ? `Kanaal: ${snapshot.subs} abonnees, ~${snapshot.avgViews} gem. views` : null,
    snapshot?.description ? `Kanaalbeschrijving: ${snapshot.description}` : null,
    p.weakness ? `Observatie: ${p.weakness}` : null,
    p.note ? `Notitie: ${p.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { text, mock } = await generateText({ template: ICP_TEMPLATE.replace("{{onderwerp}}", MENNO_ICP), input, model: "fast" });
  if (mock) return { verdict: "onbekend", score: null, reason: "AI niet beschikbaar" };

  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const score = Math.max(0, Math.min(100, Math.round(Number(json.score))));
    if (!Number.isFinite(score)) return { verdict: "onbekend", score: null, reason: "AI-antwoord onleesbaar" };
    const reden = String(json.reden ?? "").slice(0, 120);
    if (score >= ICP_KEEP_SCORE) return { verdict: "goed", score, reason: `past: ${reden}` };
    if (score >= 50) return { verdict: "twijfel", score, reason: `twijfel: ${reden}` };
    return { verdict: "geen_fit", score, reason: `past niet: ${reden}` };
  } catch {
    return { verdict: "onbekend", score: null, reason: "AI-antwoord onleesbaar" };
  }
}
