import { redirectEditorToBoard } from "@/lib/guard";
import Link from "next/link";
import { fmtEur, type ClientStatus } from "../_data";
import { PageHeader, Card, Avatar, Badge, Eyebrow, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { NotConnected } from "../_states";
import { AddClientDialog } from "./AddClientDialog";
import { SyncButton } from "./SyncButton";
import { SyncAllButton } from "./SyncAllButton";
import { PortalAccessButton } from "./PortalAccessButton";

const statusColor: Record<ClientStatus, string> = {
  actief: "#34D399",
  onboarding: "#FBBF24",
  gepauzeerd: "#6B7280",
};

export default async function Clients({ searchParams }: { searchParams: Promise<{ status?: string; manager?: string; verborgen?: string }> }) {
  await redirectEditorToBoard();
  const sp = await searchParams;
  const { clients: all, demo } = await getWorkspaceData();

  const showHidden = sp.verborgen === "1";
  const hiddenCount = all.filter((c) => c.hidden).length;
  const managers = [...new Set(all.map((c) => c.manager).filter(Boolean) as string[])].sort();

  // Gepauzeerde klanten apart: die wachten op een ja/nee, niet op werk.
  const paused = all.filter((c) => c.status === "gepauzeerd" && !c.hidden);
  const attention = all.filter((c) => !c.hidden && (c.health === "risico" || c.health === "let_op"));

  const clients = all
    .filter((c) => (showHidden ? true : !c.hidden))
    .filter((c) => (sp.status ? c.status === sp.status : c.status !== "gepauzeerd"))
    .filter((c) => (sp.manager ? c.manager === sp.manager : true));

  const mrr = all.filter((c) => c.status !== "gepauzeerd").reduce((s, c) => s + c.monthlyValue, 0);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, manager: sp.manager, verborgen: sp.verborgen, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/platform/clients?${q}` : "/platform/clients";
  };

  return (
    <>
      <PageHeader
        eyebrow="Klanten"
        title="Portalen & white-label"
        subtitle="Elke klant heeft een eigen omgeving in jouw huisstijl — eigen logo, eigen kleur, eigen domein. Zij zien alleen hun content, leads en rapporten."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SyncAllButton />
            <AddClientDialog />
            <Link
              href="/platform/clients/new"
              className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold text-sm px-4 py-2.5 transition-colors"
            >
              {icons.plus} Onboarden
            </Link>
          </div>
        }
      />

      {/* MRR strip */}
      <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-xl bg-accent/15 text-accent">
            {icons.money}
          </span>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Maandelijkse retainer (MRR)</div>
            <div className="font-display font-extrabold text-2xl">{fmtEur(mrr)}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Actief</div>
            <div className="font-display font-bold text-xl">{clients.filter((c) => c.status === "actief").length}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted">Onboarding</div>
            <div className="font-display font-bold text-xl">{clients.filter((c) => c.status === "onboarding").length}</div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <Chip href={qs({ status: undefined })} active={!sp.status} label="Actief & onboarding" />
        <Chip href={qs({ status: "actief" })} active={sp.status === "actief"} label="Alleen actief" />
        <Chip href={qs({ status: "onboarding" })} active={sp.status === "onboarding"} label="Onboarding" />
        <Chip href={qs({ status: "gepauzeerd" })} active={sp.status === "gepauzeerd"} label={`Gepauzeerd (${paused.length})`} />
        {managers.length > 0 && <span className="w-px h-5 bg-white/[0.08] mx-1" />}
        {managers.map((m) => (
          <Chip key={m} href={qs({ manager: sp.manager === m ? undefined : m })} active={sp.manager === m} label={m} />
        ))}
        {hiddenCount > 0 && (
          <>
            <span className="w-px h-5 bg-white/[0.08] mx-1" />
            <Chip
              href={qs({ verborgen: showHidden ? undefined : "1" })}
              active={showHidden}
              label={showHidden ? "Verberg verborgen" : `Toon verborgen (${hiddenCount})`}
            />
          </>
        )}
      </div>

      {/* Klanten die aandacht nodig hebben (health uit het Health-tabblad) */}
      {attention.length > 0 && (
        <Card className="p-5 mb-4 border-amber-400/20 bg-amber-400/[0.04]">
          <div className="font-display font-bold mb-2">Vraagt aandacht</div>
          <div className="flex flex-wrap gap-2">
            {attention.map((c) => (
              <Link
                key={c.id}
                href={`/platform/clients/${c.id}/health`}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] hover:border-accent/30 px-3 py-1.5 text-[13px] transition-all"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: c.health === "risico" ? "#F87171" : "#FBBF24" }} />
                {c.name}
                {c.healthNote && <span className="text-muted text-[12px] truncate max-w-[220px]">— {c.healthNote}</span>}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Gepauzeerd: wachten op een beslissing */}
      {paused.length > 0 && !sp.status && (
        <Card className="p-5 mb-4">
          <div className="font-display font-bold mb-1">Reactivatielijst</div>
          <p className="text-[12.5px] text-muted mb-3">{paused.length} gepauzeerde klant(en) — oppakken of afsluiten.</p>
          <div className="flex flex-wrap gap-2">
            {paused.map((c) => (
              <Link
                key={c.id}
                href={`/platform/clients/${c.id}/health`}
                className="rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-1.5 text-[13px] transition-all"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Eyebrow>{clients.length} klant{clients.length === 1 ? "" : "en"}</Eyebrow>
      {!demo && clients.length === 0 ? (
        <div className="mt-2">
          <NotConnected provider="Klanten">
            Nog geen klanten. Voeg je eerste klant toe om een portaal en koppelingen te starten.
          </NotConnected>
        </div>
      ) : null}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
        {clients.map((c) => (
          <Card key={c.id} hover className="p-5">
            <div className="flex items-start justify-between mb-4">
              <Link href={`/platform/clients/${c.id}`} className="flex items-center gap-3 group">
                <Avatar initials={c.initials} size={44} />
                <div>
                  <div className="font-medium group-hover:text-accent transition-colors">
                    {c.health === "risico" && <span className="text-red-400 mr-1">●</span>}
                    {c.health === "let_op" && <span className="text-amber-300 mr-1">●</span>}
                    {c.name}
                  </div>
                  <div className="text-[12px] text-muted">
                    {c.handle}
                    {c.manager && ` · ${c.manager}`}
                  </div>
                </div>
              </Link>
              <Badge color={statusColor[c.status]}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[c.status] }} />
                {c.status}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/[0.05]">
              <div>
                <div className="font-display font-bold text-lg">{c.postsLive}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted">live</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg">{c.leadsThisMonth}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted">leads</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg">{c.videosPerMonth || "—"}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted">video&rsquo;s/mnd</div>
              </div>
            </div>

            {/* Wat er in de retainer zit (video-mix van het klantprofiel) */}
            {c.contentMix && (
              <div className="mt-3 text-[11.5px] text-muted truncate" title={c.contentMix}>
                🎬 {c.contentMix}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <span className="text-[12px] text-muted">{fmtEur(c.monthlyValue)}/mnd</span>
              <div className="flex items-center gap-2">
                <SyncButton clientId={c.id} />
                <PortalAccessButton clientId={c.id} clientName={c.name} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}


function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
        active ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}
