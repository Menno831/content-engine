// ════════════════════════════════════════════════════════════════
// Koppelingen-status: per integratie alleen of de sleutel gezet is —
// nooit de waarde zelf. Server component: de env-variabelen worden op
// de server gelezen en alleen een ja/nee gaat naar de browser.
// ════════════════════════════════════════════════════════════════
import { Card, Eyebrow } from "../_components";

interface Row {
  name: string;
  what: string;
  set: boolean;
  keys: string;
  where: string;
}

export function Integrations() {
  const has = (k: string) => Boolean((process.env[k] || "").trim());

  const rows: Row[] = [
    {
      name: "Instagram (RapidAPI)",
      what: "Haalt reels, posts en volgers op — 3× per dag",
      set: has("RAPIDAPI_KEY"),
      keys: "RAPIDAPI_KEY",
      where: "rapidapi.com → abonneer op de instagram120-API",
    },
    {
      name: "YouTube",
      what: "Video's en views van je eigen kanaal en competitors",
      set: has("YOUTUBE_API_KEY"),
      keys: "YOUTUBE_API_KEY",
      where: "console.cloud.google.com → YouTube Data API v3",
    },
    {
      name: "E-mail (Resend)",
      what: "Mails naar editors en klanten, en jouw review-meldingen",
      set: has("RESEND_API_KEY"),
      keys: "RESEND_API_KEY",
      where: "resend.com → API Keys",
    },
    {
      name: "Moneybird",
      what: "Facturen van deze maand op Finance",
      set: has("MONEYBIRD_API_TOKEN") && has("MONEYBIRD_ADMINISTRATION_ID"),
      keys: "MONEYBIRD_API_TOKEN + MONEYBIRD_ADMINISTRATION_ID",
      where: "moneybird.com → Instellingen → Ontwikkelaars",
    },
    {
      name: "Asana",
      what: "Twee-weg-sync met klantborden (o.a. Arthur en Bryan)",
      set: has("ASANA_TOKEN"),
      keys: "ASANA_TOKEN",
      where: "app.asana.com/0/my-apps → Personal access token",
    },
    {
      name: "AI (Claude)",
      what: "Daily Brief, scripts, brand voice",
      set: has("ANTHROPIC_API_KEY"),
      keys: "ANTHROPIC_API_KEY",
      where: "console.anthropic.com → API Keys",
    },
    {
      name: "Transcripties (Transkriptor)",
      what: "Video/audio → transcript voor de brand voice",
      set: has("TRANSKRIPTOR_API_KEY"),
      keys: "TRANSKRIPTOR_API_KEY",
      where: "transkriptor.com → API",
    },
  ];

  const missing = rows.filter((r) => !r.set).length;

  return (
    <Card className="p-6 mt-6">
      <Eyebrow>Koppelingen</Eyebrow>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-display font-extrabold text-xl">Wat staat er al aan</h2>
        <span className="text-[12px] text-muted">
          {missing === 0 ? "alles gekoppeld ✓" : `${missing} nog niet ingesteld`}
        </span>
      </div>
      <p className="text-[12.5px] text-muted mb-4">
        Sleutels zet je in Vercel (Settings → Environment Variables) en daarna één keer opnieuw
        deployen. De waarden zelf zijn hier bewust nooit zichtbaar.
      </p>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/[0.06] bg-white/[0.01] px-3.5 py-2.5"
          >
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-mono ${
                r.set ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-300"
              }`}
            >
              {r.set ? "aan" : "ontbreekt"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-[12px] text-muted">{r.what}</div>
            </div>
            {!r.set && (
              <div className="text-[11px] text-muted/80 basis-full sm:basis-auto sm:text-right">
                <code className="text-accent">{r.keys}</code>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{r.where}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
