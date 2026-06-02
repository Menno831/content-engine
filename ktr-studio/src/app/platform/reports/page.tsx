import { fmtEur, fmtNum } from "../_data";
import { PageHeader, Card, Stat, Eyebrow, Badge, Avatar, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { NotConnected } from "../_states";

export default async function Reports() {
  const { clients, topContent } = await getWorkspaceData();
  const client = clients[2] ?? clients[0];

  if (!client) {
    return (
      <>
        <PageHeader
          eyebrow="Rapporten"
          title="Automatische rapportage"
          subtitle="Koppel een klant en sync content om hier een rapport te genereren."
        />
        <NotConnected provider="Rapporten">
          Nog geen klanten of content — voeg een klant toe en draai een Instagram-sync.
        </NotConnected>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Rapporten"
        title="Automatische rapportage"
        subtitle="Elke klant krijgt maandelijks automatisch een merkrapport — bereik, leads en omzet uit hun content. Geen handwerk meer."
        action={
          <div className="flex gap-2">
            <button className="rounded-xl border border-white/[0.08] hover:border-accent/30 px-4 py-2.5 text-sm transition-all">
              Plan instellen
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors">
              {icons.send} Verstuur nu
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rapport-overzicht links */}
        <div className="space-y-3">
          <Eyebrow>Geplande rapporten</Eyebrow>
          {clients.filter((c) => c.status === "actief").map((c) => (
            <Card key={c.id} hover className="p-4 flex items-center gap-3">
              <Avatar initials={c.initials} size={38} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-[12px] text-muted">Maandelijks · 1e v/d maand</div>
              </div>
              <Badge color="#34D399">Aan</Badge>
            </Card>
          ))}
          <Card className="p-4 border-dashed">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <span className="text-accent">{icons.spark}</span>
              Rapporten worden automatisch gegenereerd en gemaild op de ingestelde dag.
            </div>
          </Card>
        </div>

        {/* Rapport-preview */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          {/* Rapport header (white-label) */}
          <div className="bg-gradient-to-br from-accent/[0.12] to-transparent border-b border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent text-background">
                  {icons.spark}
                </span>
                <span className="font-display font-extrabold">KTR Studio</span>
              </div>
              <span className="font-mono text-[11px] text-muted">MEI 2026 · MAANDRAPPORT</span>
            </div>
            <h2 className="font-display font-extrabold text-2xl">{client.name}</h2>
            <p className="text-muted text-sm">{client.handle} · contentprestaties</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Kerncijfers */}
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Bereik" value={fmtNum(190200)} delta="+38%" />
              <Stat label="Leads" value="68" delta="+24%" />
              <Stat label="Omzet" value={fmtEur(client.revenueAttributed)} delta="+52%" />
            </div>

            {/* Samenvatting */}
            <div>
              <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                <span className="text-accent">{icons.spark}</span> AI-samenvatting
              </h3>
              <p className="text-[13px] text-foreground/75 leading-relaxed bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                Sterke maand. De reel &ldquo;1 reel = 1 klant van €3.200&rdquo; was de uitschieter met 84K
                views en 22 leads. Klant-resultaat content presteert structureel het best — advies voor
                juni: 3 extra case-reels inplannen. Omzet uit content steeg met 52% t.o.v. april.
              </p>
            </div>

            {/* Top content in rapport */}
            <div>
              <h3 className="font-display font-bold text-sm mb-3">Top content deze maand</h3>
              <div className="space-y-2">
                {topContent.filter((c) => c.client === client.name).map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.01] px-4 py-3">
                    <span className="text-sm truncate">{c.title}</span>
                    <div className="flex items-center gap-4 shrink-0 text-[12px]">
                      <span className="flex items-center gap-1 text-muted">
                        <span className="w-3.5 h-3.5">{icons.eye}</span> {fmtNum(c.views)}
                      </span>
                      <span className="text-emerald-400 font-mono">{fmtEur(c.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
