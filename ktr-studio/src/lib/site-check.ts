// ════════════════════════════════════════════════════════════════
// Website-check zonder externe tool: haalt de eigen site op en kijkt
// naar wat je zelf ook zou checken — bereikbaar, snel, https, titel,
// omschrijving, mobiel-viewport, canonical, og:image, één H1.
// Geeft de bevindingen in mensentaal terug, één regel per punt.
// ════════════════════════════════════════════════════════════════

export interface SiteCheck {
  url: string;
  ok: boolean;
  status: number | null;
  ms: number;
  https: boolean;
  title: string | null;
  description: string | null;
  hasViewport: boolean;
  hasCanonical: boolean;
  hasOgImage: boolean;
  h1Count: number;
  issues: string[];
}

const meta = (html: string, attr: "name" | "property", key: string): string | null => {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, "i");
  return html.match(re)?.[1] ?? html.match(re2)?.[1] ?? null;
};

export async function checkSite(rawUrl: string): Promise<SiteCheck> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const started = Date.now();
  const issues: string[] = [];

  let status: number | null = null;
  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 (compatible; KTRStudio-SiteCheck/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    status = res.status;
    html = await res.text();
  } catch (e) {
    return {
      url, ok: false, status, ms: Date.now() - started, https: url.startsWith("https://"),
      title: null, description: null, hasViewport: false, hasCanonical: false, hasOgImage: false, h1Count: 0,
      issues: [`Site niet bereikbaar: ${e instanceof Error ? e.message : "onbekende fout"}`],
    };
  }
  const ms = Date.now() - started;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
  const description = meta(html, "name", "description");
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hasOgImage = Boolean(meta(html, "property", "og:image"));
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const https = url.startsWith("https://");

  if (status && status >= 400) issues.push(`Site geeft status ${status}.`);
  if (ms > 2500) issues.push(`Traag: ${(ms / 1000).toFixed(1)}s tot de eerste byte — richt op onder de 1,5s.`);
  if (!https) issues.push("Geen https.");
  if (!title) issues.push("Geen paginatitel — Google en LinkedIn tonen dan een kale link.");
  else if (title.length > 60) issues.push(`Titel is ${title.length} tekens; Google knipt af na ~60.`);
  if (!description) issues.push("Geen meta-omschrijving — je bepaalt nu niet wat er onder de link staat.");
  else if (description.length > 160) issues.push(`Omschrijving is ${description.length} tekens; na ~160 wordt geknipt.`);
  if (!hasViewport) issues.push("Geen viewport-meta: op mobiel wordt de site uitgezoomd getoond.");
  if (!hasCanonical) issues.push("Geen canonical-link — kan dubbele indexering geven.");
  if (!hasOgImage) issues.push("Geen og:image — gedeelde links op IG/LinkedIn/WhatsApp krijgen geen preview.");
  if (h1Count === 0) issues.push("Geen H1 op de pagina.");
  if (h1Count > 1) issues.push(`${h1Count} H1's — hou het bij één.`);

  return { url, ok: !status || status < 400, status, ms, https, title, description, hasViewport, hasCanonical, hasOgImage, h1Count, issues };
}
