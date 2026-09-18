"use client";

// ════════════════════════════════════════════════════════════════
// Kostprijs, verkoopprijs en de marge — gedeeld door "Add card" en
// "Quick add". De bedragen vullen zichzelf in: de kostprijs komt van
// het tarief van de gekozen editor, de verkoopprijs van de standaard-
// prijs van de klant. Allebei overschrijfbaar; de rekensom eronder
// laat direct zien wat je eraan overhoudt.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

export interface PriceOption {
  id: string;
  label: string;
  /** Tarief van de editor of standaardprijs van de klant. */
  amount?: number;
}

const eur = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parse = (v: string) => {
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function PriceFields({
  editors,
  clients,
  editorId,
  clientId,
  /** Aantal video's — bij Quick add rekent de som over de hele batch. */
  count = 1,
  labels,
}: {
  editors: PriceOption[];
  clients: PriceOption[];
  editorId: string;
  clientId: string;
  count?: number;
  labels?: { cost: string; sell: string; perVideo: string; total: string; margin: string; noPrices: string };
}) {
  const t = labels ?? {
    cost: "Cost price (editor)",
    sell: "Sell price (client)",
    perVideo: "per video",
    total: "Total",
    margin: "margin",
    noPrices: "Fill in a price to see what you earn on this.",
  };

  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");
  // Onthoudt of de gebruiker zelf iets heeft ingetypt — dan nooit meer
  // overschrijven als hij daarna van editor of klant wisselt.
  const [costTouched, setCostTouched] = useState(false);
  const [sellTouched, setSellTouched] = useState(false);

  const editorRate = editors.find((e) => e.id === editorId)?.amount;
  const clientPrice = clients.find((c) => c.id === clientId)?.amount;

  useEffect(() => {
    if (!costTouched) setCost(editorRate && editorRate > 0 ? String(editorRate) : "");
  }, [editorRate, costTouched]);

  useEffect(() => {
    if (!sellTouched) setSell(clientPrice && clientPrice > 0 ? String(clientPrice) : "");
  }, [clientPrice, sellTouched]);

  const c = parse(cost);
  const s = parse(sell);
  const marginOne = s - c;
  const n = Math.max(1, count);
  const pct = s > 0 ? (marginOne / s) * 100 : null;

  const field =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors";
  const label = "block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>{t.cost}</span>
          <input
            name="cost_price"
            inputMode="decimal"
            value={cost}
            onChange={(e) => {
              setCost(e.target.value);
              setCostTouched(true);
            }}
            placeholder="21,41"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>{t.sell}</span>
          <input
            name="sell_price"
            inputMode="decimal"
            value={sell}
            onChange={(e) => {
              setSell(e.target.value);
              setSellTouched(true);
            }}
            placeholder="75,00"
            className={field}
          />
        </label>
      </div>

      {/* De rekensom: wat kost het, wat levert het op, wat blijft er over */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        {c === 0 && s === 0 ? (
          <p className="text-[12.5px] text-muted">{t.noPrices}</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] text-muted">
                {n > 1 ? `${n} × ${eur(c)}` : t.perVideo}
              </span>
              <span className="font-mono text-sm tabular-nums">
                −{eur(c * n)} <span className="text-muted">kosten</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 mt-1">
              <span className="text-[12.5px] text-muted">{n > 1 ? `${n} × ${eur(s)}` : ""}</span>
              <span className="font-mono text-sm tabular-nums text-foreground/80">
                +{eur(s * n)} <span className="text-muted">omzet</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 mt-2 pt-2 border-t border-white/[0.06]">
              <span className="text-[12.5px] font-medium">{t.total}</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  marginOne < 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {eur(marginOne * n)}
                {pct !== null && (
                  <span className="text-muted font-normal"> · {pct.toFixed(0)}% {t.margin}</span>
                )}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
