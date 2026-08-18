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

export default async function Clients() {
  await redirectEditorToBoard();
  const { clients, demo } = await getWorkspaceData();
  const mrr = clients.filter((c) => c.status !== "gepauzeerd").reduce((s, c) => s + c.monthlyValue, 0);

  return (
    <>
      <PageHeader
        eyebrow="Klanten"
        title="Portalen & white-label"
        subtitle="Elke klant heeft een eigen omgeving in jouw huisstijl — eigen logo, eigen kleur, eigen domein. Zij zien alleen hun content, leads en rapporten."
        action={
          <div className="flex items-center gap-2">
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

      <Eyebrow>Alle klanten</Eyebrow>
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
                  <div className="font-medium group-hover:text-accent transition-colors">{c.name}</div>
                  <div className="text-[12px] text-muted">{c.handle}</div>
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
