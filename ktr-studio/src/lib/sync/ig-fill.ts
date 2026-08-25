// ════════════════════════════════════════════════════════════════
// Instagram-handle vinden voor prospects die alleen een YouTube-
// kanaal hebben: creators zetten hun IG bijna altijd in de kanaal-
// beschrijving. We lezen die via de YouTube Data API (1 quota-unit
// per kanaal) en vissen er de instagram.com-link uit.
// ════════════════════════════════════════════════════════════════

const YT_KEY = process.env.YOUTUBE_API_KEY ?? "";

// Welke query kunnen we op de API afvuren voor deze youtube-waarde?
// (kanaal-id direct; @handle of kale handle via forHandle; vrije
// tekst is niet betrouwbaar op te lossen — die slaan we over)
function channelParam(youtube: string): { key: "id" | "forHandle"; value: string } | null {
  const s = (youtube ?? "").trim();
  const id = s.match(/(UC[A-Za-z0-9_-]{22})/);
  if (id) return { key: "id", value: id[1] };
  const handle = s.match(/@([A-Za-z0-9._-]{3,30})/);
  if (handle) return { key: "forHandle", value: `@${handle[1]}` };
  if (/^[A-Za-z0-9._-]{3,30}$/.test(s)) return { key: "forHandle", value: `@${s}` };
  return null;
}

const NOT_HANDLES = new Set(["p", "reel", "reels", "stories", "accounts", "explore", "tv", "direct"]);

export async function findInstagramViaYoutube(youtube: string): Promise<string | null> {
  if (!YT_KEY) return null;
  const p = channelParam(youtube);
  if (!p) return null;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&${p.key}=${encodeURIComponent(p.value)}&key=${YT_KEY}`,
    { next: { revalidate: 86_400 } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const c = json?.items?.[0];
  if (!c) return null;

  const text = [c.snippet?.description, c.brandingSettings?.channel?.description].filter(Boolean).join("\n");
  const m = text.match(/instagram\.com\/([A-Za-z0-9._]{2,30})/i);
  if (!m) return null;
  const handle = m[1].replace(/\.+$/, "");
  if (NOT_HANDLES.has(handle.toLowerCase())) return null;
  return `@${handle}`;
}
