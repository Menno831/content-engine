// ════════════════════════════════════════════════════════════════
// Sync van één klant over alle bronnen (Instagram + YouTube).
// Eén ingang voor de cron én de handmatige "Sync"-knop, zodat beide
// altijd dezelfde bronnen meenemen.
// ════════════════════════════════════════════════════════════════
import { syncClientInstagram } from "./instagram";
import { syncClientYouTube } from "./youtube";

export interface ClientSyncResult {
  ok: boolean;
  instagram?: { ok: boolean; items?: number; error?: string };
  youtube?: { ok: boolean; items?: number; error?: string };
  items: number;
  error?: string;
}

export async function syncClientAll(clientId: string): Promise<ClientSyncResult> {
  const [ig, yt] = await Promise.all([
    syncClientInstagram(clientId).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "fout" })),
    syncClientYouTube(clientId).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "fout" })),
  ]);

  // "geen_bron" telt niet als echte fout (die bron is simpelweg niet gekoppeld).
  const igReal = ig.ok || ig.error !== "geen_bron";
  const ytReal = yt.ok || yt.error !== "geen_bron";
  const items = ("items" in ig ? ig.items ?? 0 : 0) + ("items" in yt ? yt.items ?? 0 : 0);

  return {
    ok: ig.ok || yt.ok,
    instagram: igReal ? { ok: ig.ok, items: "items" in ig ? ig.items : undefined, error: ig.error } : undefined,
    youtube: ytReal ? { ok: yt.ok, items: "items" in yt ? yt.items : undefined, error: yt.error } : undefined,
    items,
    error: !ig.ok && !yt.ok ? (ig.error === "geen_bron" && yt.error === "geen_bron" ? "geen_bron" : (ig.error || yt.error)) : undefined,
  };
}
