"use client";

import { revenueByMonth, topContent, clients, fmtEur, fmtNum } from "../_data";
import { PageHeader, Card, Stat, Eyebrow, Badge, icons } from "../_components";

export default function Analytics() {
  const maxRev = Math.max(...revenueByMonth.map((d) => d.v));
  // SVG line chart punten
  const W = 100, H = 100;
  const pts = revenueByMonth.map((d, i) => {
    const x = (i / (revenueByMonth.length - 1)) * W;
    const y = H - (d.v / maxRev) * (H - 10) - 5;
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  const totalViews = topContent.reduce((s, c) => s + c.views, 0);
  const totalLeads = topContent.reduce((s, c) => s + c.leads, 0);
  const maxViews = Math.max(...topContent.map((c) => c.views));

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Content performance"
        subtitle="Welke content bracht het meeste op — niet in likes, maar in leads en omzet. Data uit je Instagram-koppeling, gekruist met je sales pipeline."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Totaal bereik" value={fmtNum(totalViews)} delta="+41% vs. vorige maand" icon={icons.eye} />
        <Stat label="Leads uit content" value={String(totalLeads)} delta="+18%" icon={icons.leads} />
        <Stat label="Omzet / 1K views" value="€42" delta="+€7" icon={icons.money} />
        <Stat label="Beste format" value="Reel" icon={icons.analytics} />
      </div>

      {/* Line chart */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Eyebrow>Omzet-trend</Eyebrow>
            <h2 className="font-display font-extrabold text-xl">Omzet uit content · 12 maanden</h2>
          </div>
          <Badge color="#34D399">{icons.arrowUp} consistent groeiend</Badge>
        </div>
        <div className="relative h-56">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((y) => (
              <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.3" />
            ))}
            <path d={area} fill="url(#rev)" />
            <path d={line} fill="none" stroke="#F97316" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="0.9" fill="#FB923C" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
        <div className="flex justify-between mt-2 px-1">
          {revenueByMonth.map((d, i) => (
            <span key={d.m} className={`font-mono text-[10px] uppercase ${i === revenueByMonth.length - 1 ? "text-accent" : "text-muted"}`}>
              {d.m}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top content tabel */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="font-display font-extrabold text-xl mb-5">Best presterende content</h2>
          <div className="space-y-4">
            {topContent.map((c, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="font-display font-extrabold text-lg text-muted w-5">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-[12px] text-muted">{c.client}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${(c.views / maxViews) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm">{fmtNum(c.views)}</div>
                  <div className="text-[11px] text-emerald-400">{fmtEur(c.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Per klant */}
        <Card className="p-6">
          <h2 className="font-display font-extrabold text-xl mb-5">Omzet per klant</h2>
          <div className="space-y-4">
            {[...clients]
              .filter((c) => c.revenueAttributed > 0)
              .sort((a, b) => b.revenueAttributed - a.revenueAttributed)
              .map((c) => {
                const max = Math.max(...clients.map((x) => x.revenueAttributed));
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-emerald-400">{fmtEur(c.revenueAttributed)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent" style={{ width: `${(c.revenueAttributed / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </>
  );
}
