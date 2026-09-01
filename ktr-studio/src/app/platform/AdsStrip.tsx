import Link from "next/link";
import { getAdData } from "@/lib/ads";
import { totalsOf, groupBy, colorFor } from "@/lib/ads-shared";
import { icons } from "./_components";

// Compacte advertentiestrip op het dashboard: de vier cijfers die
// ertoe doen over 30 dagen, met het verschil t.o.v. de 30 dagen ervoor.
// Verschijnt alleen als er advertentiedata is — anders is het ruis.
export async function AdsStrip() {
  const data = await getAdData(30, null);
  if (data.migrationMissing || data.entries.length === 0) return null;

  const now = totalsOf(data.entries);
  const before = totalsOf(data.previous);
  const platforms = groupBy(data.entries, (e) => e.platform);

  const eur = (n: number) => `€${n.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`;
  const eur2 = (n: number) => `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function delta(a: number | null, b: number | null, lowerIsBetter: boolean) {
    if (a === null || b === null || b === 0) return null;
    const pct = ((a - b) / b) * 100;
    if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) return { text: "gelijk", good: null as boolean | null };
    return { text: `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`, good: lowerIsBetter ? pct < 0 : pct > 0 };
  }

  const cells = [
    { label: "Uitgegeven", value: eur(now.spend), d: delta(now.spend, before.spend, true) },
    { label: "Resultaten", value: String(now.results), d: delta(now.results, before.results, false) },
    { label: "Per resultaat", value: now.cpl === null ? "—" : eur2(now.cpl), d: delta(now.cpl, before.cpl, true) },
    {
      label: "ROAS",
      value: now.roas === null ? "—" : `${now.roas.toFixed(2)}×`,
      d: delta(now.roas, before.roas, false),
    },
  ];

  return (
    <Link
      href="/platform/advertising"
      className="group block rounded-2xl border border-white/[0.07] bg-card p-5 mb-6 hover:border-accent/25 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent/15 text-accent">{icons.money}</span>
          <div>
            <div className="font-display font-bold">Advertenties</div>
            <div className="text-[12px] text-muted">
              laatste 30 dagen ·{" "}
              {platforms.map((p, i) => (
                <span key={p.key}>
                  {i > 0 && " · "}
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-sm align-middle" style={{ background: colorFor(p.key) }} />
                    {p.key}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <span className="text-[13px] text-muted group-hover:text-accent transition-colors flex items-center gap-1">
          Alles bekijken {icons.arrowRight}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cells.map((c) => (
          <div key={c.label}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{c.label}</div>
            <div className="font-display font-extrabold text-xl tabular-nums leading-none">{c.value}</div>
            {c.d && (
              <div className={`mt-1 text-[11px] ${c.d.good === null ? "text-muted" : c.d.good ? "text-emerald-400" : "text-red-400"}`}>
                {c.d.text} <span className="text-muted">vs vorige 30 dagen</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}
