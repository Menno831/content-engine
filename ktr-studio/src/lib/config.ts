// ════════════════════════════════════════════════════════════════
// Centrale config + "echte data of niets"-schakelaars.
// Eén bron van waarheid voor of een koppeling beschikbaar is.
// ════════════════════════════════════════════════════════════════

/**
 * Demo-modus toont gelabelde voorbeelddata (met zichtbare banner).
 * Standaard AAN totdat expliciet uitgezet, zodat we nooit per ongeluk
 * lege schermen tonen tijdens het bouwen — maar altijd duidelijk
 * gemarkeerd dat het géén echte data is.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

/** Supabase pas "geconfigureerd" als beide publieke keys aanwezig zijn. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Per-bron: is de koppeling überhaupt geconfigureerd (server-side env)?
 * Dit zegt nog niets over of een specifieke klant verbonden is — dat
 * staat in de `integrations`-tabel. Dit is de globale "kan dit aan"-check.
 */
export const providerConfigured = {
  instagram_scrape: () => Boolean(process.env.RAPIDAPI_KEY),
  instagram_graph: () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
  youtube: () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  manychat: () => Boolean(process.env.MANYCHAT_API_KEY),
} as const;

export type ProviderKey = keyof typeof providerConfigured;

/** Higgsfield (AI Visuals / Soul-characters) — server-side. */
export const isHiggsfieldConfigured = Boolean(process.env.HIGGSFIELD_API_KEY);
