// ════════════════════════════════════════════════════════════════
// Prospect-kwalificatie: is dit iemand waar we echt iets voor
// kunnen betekenen — én die ons kan betalen?
//
// Twee poorten:
// 1. HIGH-TICKET — verkoopt deze persoon iets van minstens €1000
//    (coaching, agency, done-for-you, B2B, mastermind)? Zonder
//    zo'n aanbod is een content-retainer nooit rendabel voor ze.
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

const OFFER_TEMPLATE = `Je beoordeelt of een creator/ondernemer een interessante prospect is voor een premium content-agency (retainer vanaf €1000 per maand). Enige criterium: heeft deze persoon zeer waarschijnlijk een HIGH-TICKET aanbod — iets van minstens €1000 dat ze zelf verkopen? Denk aan: coaching of mentorship, een eigen agency of bureau, done-for-you diensten, B2B-dienstverlening, mastermind, high-ticket cursus, vastgoed- of financiële dienstverlening.

GEEN fit: iemand die vooral leeft van AdSense, sponsors, affiliate, merchandise of goedkope cursussen, zonder eigen duur aanbod.

Antwoord ALLEEN met JSON, niets eromheen:
{"high_ticket":"ja"|"nee"|"onzeker","reden":"<max 12 woorden, Nederlands>"}

PROSPECT:
{{onderwerp}}`;

export interface FitVerdict {
  verdict: "goed" | "twijfel" | "geen_high_ticket" | "al_sterk";
  reason: string;
}

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
      reason: `YouTube loopt al sterk (~${Math.round(snapshot.avgViews / 1000)}K gem. views) — weinig te fixen`,
    };
  }

  // Poort 1: high-ticket aanbod (AI-oordeel op alle beschikbare context).
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

  const { text, mock } = await generateText({ template: OFFER_TEMPLATE, input, model: "fast" });
  if (mock) return { verdict: "twijfel", reason: "AI niet beschikbaar — handmatig checken" };

  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const reden = String(json.reden ?? "").slice(0, 120);
    if (json.high_ticket === "nee") return { verdict: "geen_high_ticket", reason: `geen high-ticket aanbod — ${reden}` };
    if (json.high_ticket === "ja") return { verdict: "goed", reason: `high-ticket: ${reden}` };
    return { verdict: "twijfel", reason: `twijfel over aanbod — ${reden}` };
  } catch {
    return { verdict: "twijfel", reason: "AI-antwoord onleesbaar — handmatig checken" };
  }
}
