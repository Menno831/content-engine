import Link from "next/link";
import { getClientLeads } from "@/lib/workspace";
import { Card, Eyebrow, Badge } from "../../../_components";
import { fmtEur } from "../../../_data";

const PERIODS = [
  { days: 30, label: "30 dagen" },
  { days: 90, label: "90 dagen" },
  { days: 365, label: "Dit jaar" },
];

const stageMeta: Record<string, { label: string; color: string }> = {
  nieuw: { label: "Nieuw", color: "#60A5FA" },
  gekwalificeerd: { label: "Gekwalificeerd", color: "#A78BFA" },
  call_gepland: { label: "Call gepland", color: "#FBBF24" },
  closed: { label: "Gewonnen", color: "#34D399" },
  verloren: { label: "Verloren", color: "#6B7280" },
};

// Leads-tab: wat de content van deze klant oplevert, en waar het strandt.
export default async function ClientLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dagen?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const days = PERIODS.find((p) => String(p.days) === sp.dagen)?.days ?? 30;
  const { rows, funnel, bySource } = await getClientLeads(id, days);

  const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);
  const base = `/platform/clients/${id}/leads`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-muted">Elke lead die deze klant binnenhaalde in de gekozen periode.</p>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p.days}
              href={p.days === 30 ? base : `${base}?dagen=${p.days}`}
              className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                days === p.days
                  ? "bg-accent text-background font-bold"
                  : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Leads</div>
          <div className="font-display font-extrabold text-2xl">{funnel.leads}</div>
        </Card>
        <Card className="p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Gewonnen</div>
          <div className="font-display font-extrabold text-2xl">{funnel.won}</div>
          <div className="text-[11px] text-muted mt-0.5">{pct(funnel.won, funnel.leads)}% conversie</div>
        </Card>
        <Card className="p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Omzet</div>
          <div className="font-display font-extrabold text-2xl text-emerald-400">{fmtEur(funnel.cash)}</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Trechter */}
        <Card className="p-6">
          <Eyebrow>Waar het strandt</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-4">Conversie-trechter</h2>
          {[
            { label: "Leads", value: funnel.leads, of: funnel.leads, color: "#60A5FA" },
            { label: "Call gepland", value: funnel.booked, of: funnel.leads, color: "#A78BFA" },
            { label: "Gesproken", value: funnel.showed, of: funnel.booked, color: "#FBBF24" },
            { label: "Gewonnen", value: funnel.won, of: funnel.showed, color: "#34D399" },
          ].map((step) => (
            <div key={step.label} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: step.color }} />
                  {step.label}
                </span>
                <span className="font-mono">
                  {step.value}
                  {step.label !== "Leads" && <span className="text-muted ml-2 text-[11.5px]">{pct(step.value, step.of)}%</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct(step.value, funnel.leads)}%`, background: step.color }}
                />
              </div>
            </div>
          ))}
        </Card>

        {/* Per bron */}
        <Card className="p-6">
          <Eyebrow>Waar ze vandaan komen</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-4">Per bron</h2>
          {bySource.length === 0 ? (
            <p className="text-[13px] text-muted">Nog geen leads in deze periode.</p>
          ) : (
            <div className="space-y-3">
              {bySource.map((s) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <span className="truncate">{s.source}</span>
                    <span className="text-muted text-[12px]">
                      {s.leads} leads · {s.won} gewonnen
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct(s.leads, funnel.leads)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tabel */}
      <Card className="p-6">
        <h2 className="font-display font-extrabold text-xl mb-4">Alle leads</h2>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted">
            Nog geen leads. Zodra ManyChat of een formulier binnenkomt verschijnen ze hier automatisch.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  <th className="text-left font-normal pb-2">Naam</th>
                  <th className="text-left font-normal pb-2">Bron</th>
                  <th className="text-left font-normal pb-2">Contact</th>
                  <th className="text-left font-normal pb-2">Status</th>
                  <th className="text-right font-normal pb-2">Waarde</th>
                  <th className="text-right font-normal pb-2">Binnen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const m = stageMeta[l.stage] ?? { label: l.stage, color: "#6B7280" };
                  return (
                    <tr key={l.id} className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-3 font-medium">{l.name}</td>
                      <td className="py-2 pr-3 text-muted">{l.source || l.sourceLabel || "—"}</td>
                      <td className="py-2 pr-3 text-muted">
                        {l.instagram ? (
                          <a
                            href={`https://instagram.com/${l.instagram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent transition-colors"
                          >
                            {l.instagram}
                          </a>
                        ) : (
                          l.email || l.phone || "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge color={m.color}>{m.label}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{l.value ? fmtEur(l.value) : "—"}</td>
                      <td className="py-2 text-right text-muted whitespace-nowrap">
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
