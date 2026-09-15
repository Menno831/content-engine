// Stripe op Finance (alleen-lezen): betalingen van de gekozen maand,
// lopende abonnementen en wat er onderweg is naar de bank. Een betaling
// die ook als betaalde Moneybird-factuur bestaat krijgt het label
// "ook in Moneybird" en telt niet dubbel mee in de omzet.

import { Card, Eyebrow } from "../_components";
import type { StripeMonth, StripeSubscriptions, StripePayout } from "@/lib/integrations/stripe";

const fmt = (n: number, currency: string) => {
  const c = currency.toLowerCase();
  const sym = c === "eur" ? "€" : c === "usd" ? "$" : c === "gbp" ? "£" : `${c.toUpperCase()} `;
  return sym + Math.round(n).toLocaleString("nl-NL", { maximumFractionDigits: 0 });
};

const dateNl = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "";

const subStatus: Record<string, { label: string; cls: string }> = {
  active: { label: "actief", cls: "text-emerald-400" },
  trialing: { label: "proef", cls: "text-sky-300" },
  past_due: { label: "betaling mislukt", cls: "text-red-400" },
};

const payoutStatus: Record<string, string> = {
  paid: "uitbetaald",
  pending: "gepland",
  in_transit: "onderweg",
  failed: "mislukt",
  canceled: "geannuleerd",
};

export function StripeCard({
  maandLabel,
  month,
  subs,
  payouts,
}: {
  maandLabel: string;
  month: StripeMonth;
  subs: StripeSubscriptions;
  payouts: { payouts: StripePayout[]; error?: string };
}) {
  const cur = month.currency;
  const nietInMoneybird = month.payments.filter((p) => !p.refund && !p.inMoneybird).reduce((s, p) => s + p.net, 0);
  const upcoming = payouts.payouts.filter((p) => p.status === "pending" || p.status === "in_transit");

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <Eyebrow>Stripe · {maandLabel}</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Wat er via Stripe binnenkomt</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span>
            <span className="text-muted text-[12px]">Bruto </span>
            <strong className="font-mono">{fmt(month.gross, cur)}</strong>
          </span>
          <span>
            <span className="text-muted text-[12px]">Stripe-kosten </span>
            <strong className="font-mono text-amber-300">−{fmt(month.fee, cur)}</strong>
          </span>
          {month.refunds > 0 && (
            <span>
              <span className="text-muted text-[12px]">Terugbetaald </span>
              <strong className="font-mono text-red-400">−{fmt(month.refunds, cur)}</strong>
            </span>
          )}
          <span>
            <span className="text-muted text-[12px]">Netto </span>
            <strong className="font-mono text-emerald-400">{fmt(month.net, cur)}</strong>
          </span>
        </div>
      </div>

      {month.error ? (
        <p className="text-[13px] text-amber-300">{month.error}</p>
      ) : month.payments.length === 0 ? (
        <p className="text-[13px] text-muted">Geen Stripe-betalingen in {maandLabel}.</p>
      ) : (
        <>
          <div className="divide-y divide-white/[0.06]">
            {month.payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {p.refund ? <span className="text-red-400">Terugbetaling · </span> : null}
                    {p.who}
                  </div>
                  <div className="text-[12px] text-muted truncate">
                    {dateNl(p.date)}
                    {p.description ? ` · ${p.description}` : ""}
                    {p.inMoneybird ? <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[11px]">ook in Moneybird</span> : null}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className={p.refund ? "text-red-400" : ""}>{fmt(p.net, p.currency)}</div>
                  {!p.refund && p.fee > 0 && <div className="text-[11px] text-muted">bruto {fmt(p.gross, p.currency)}</div>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">
            {fmt(nietInMoneybird, cur)} hiervan staat niet als betaalde factuur in Moneybird en telt mee in de maandomzet. De rest zit al in de Moneybird-cijfers.
          </p>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2 mt-6 pt-6 border-t border-white/[0.06]">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Eyebrow>Abonnementen</Eyebrow>
            <span className="text-sm">
              <span className="text-muted text-[12px]">MRR via Stripe </span>
              <strong className="font-mono">{fmt(subs.mrr, subs.subscriptions[0]?.currency ?? cur)}</strong>
              {subs.pastDue > 0 && <span className="ml-2 text-red-400 text-[12px] font-bold">{subs.pastDue} betaling mislukt</span>}
            </span>
          </div>
          {subs.error ? (
            <p className="text-[13px] text-amber-300">{subs.error}</p>
          ) : subs.subscriptions.length === 0 ? (
            <p className="text-[13px] text-muted">Geen lopende abonnementen in Stripe.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {subs.subscriptions.map((s) => {
                const st = subStatus[s.status] ?? { label: s.status, cls: "text-muted" };
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.who}</div>
                      <div className="text-[12px] text-muted">
                        per {s.interval} · <span className={st.cls}>{st.label}</span>
                        {s.nextCharge ? ` · volgende ${dateNl(s.nextCharge)}` : ""}
                      </div>
                    </div>
                    <div className="font-mono">{fmt(s.monthly, s.currency)}<span className="text-[11px] text-muted"> /mnd</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <Eyebrow>Naar de bank</Eyebrow>
          {payouts.error ? (
            <p className="text-[13px] text-amber-300 mt-2">{payouts.error}</p>
          ) : payouts.payouts.length === 0 ? (
            <p className="text-[13px] text-muted mt-2">Nog geen uitbetalingen.</p>
          ) : (
            <div className="divide-y divide-white/[0.06] mt-2">
              {payouts.payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="text-[12px] text-muted">
                    {dateNl(p.arrival)} · <span className={p.status === "paid" ? "text-emerald-400" : p.status === "failed" ? "text-red-400" : "text-amber-300"}>{payoutStatus[p.status] ?? p.status}</span>
                  </div>
                  <div className="font-mono">{fmt(p.amount, p.currency)}</div>
                </div>
              ))}
              {upcoming.length > 0 && (
                <p className="pt-2 text-[12px] text-muted">
                  Onderweg: <strong className="font-mono text-amber-300">{fmt(upcoming.reduce((s, p) => s + p.amount, 0), upcoming[0].currency)}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
