"use client";

import { useActionState, useState, useTransition } from "react";
import { createOrderAction, updateOrderStatusAction, deleteOrderAction, type ActionResult } from "./actions";
import { Card, Badge, icons } from "../_components";
import { fmtEur } from "../_data";
import type { Order } from "@/lib/data";

const initial: ActionResult = {};

const STATUSES = ["open", "bezig", "review", "klaar", "gefactureerd"] as const;
const statusColor: Record<string, string> = {
  open: "#FBBF24",
  bezig: "#60A5FA",
  review: "#C084FC",
  klaar: "#34D399",
  gefactureerd: "#9CA3AF",
};

/**
 * Opdrachten per klant: prijs, kosten en deliverables per opdracht —
 * marge wordt direct uitgerekend, status is in één klik bij te werken.
 */
function monthLabel(iso: string | null): string {
  if (!iso) return "Zonder maand";
  return new Date(iso).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

export function OrdersCard({ clientId, orders }: { clientId: string; orders: Order[] }) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState(createOrderAction, initial);
  const [, startTransition] = useTransition();

  const open = orders.filter((o) => o.status !== "gefactureerd");
  const totalMarge = open.reduce((s, o) => s + (o.price - o.editorCost - o.otherCost), 0);

  // Groeperen per factuurmaand (nieuwste eerst; data komt al gesorteerd binnen).
  const byMonth: { key: string; label: string; items: Order[] }[] = [];
  for (const o of orders) {
    const key = o.invoiceMonth ?? "geen";
    let group = byMonth.find((g) => g.key === key);
    if (!group) {
      group = { key, label: monthLabel(o.invoiceMonth), items: [] };
      byMonth.push(group);
    }
    group.items.push(o);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-extrabold text-xl">Opdrachten</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold px-3 py-1.5 text-[12px] transition-colors"
        >
          {icons.plus} {adding ? "Sluiten" : "Nieuwe opdracht"}
        </button>
      </div>
      <p className="text-muted text-sm mb-4">
        {open.length > 0 ? (
          <>Lopend: {open.length} · verwachte marge <strong className="text-emerald-400">{fmtEur(totalMarge)}</strong></>
        ) : (
          "Leg elke nieuwe opdracht vast — je ziet direct wat je eraan overhoudt."
        )}
      </p>
      {state.ok && <p className="mb-3 text-[13px] text-emerald-400">{state.ok}</p>}
      {state.error && <p className="mb-3 text-[13px] text-red-400">{state.error}</p>}

      {adding && (
        <form action={action} className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input
            name="title"
            required
            placeholder="Titel — bijv. '12 Reels juli'"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
          />
          <textarea
            name="deliverables"
            rows={2}
            placeholder="Wat moet er gedaan worden? (deliverables, afspraken)"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40 resize-y"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Prijs €</span>
              <input name="price" type="number" min="0" step="50" placeholder="2500" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40" />
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Editor €</span>
              <input name="editor_cost" type="number" min="0" step="10" placeholder="720" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40" />
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Overig €</span>
              <input name="other_cost" type="number" min="0" step="10" placeholder="0" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40" />
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Deadline</span>
              <input name="deadline" type="date" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Factuurmaand *</span>
              <input
                name="invoice_month"
                type="month"
                required
                defaultValue={new Date().toISOString().slice(0, 7)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Factuurnr. / referentie</span>
              <input name="invoice_ref" placeholder="bijv. 2026-014" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40" />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2 transition-colors"
          >
            {pending ? "Toevoegen…" : "Opdracht toevoegen"}
          </button>
        </form>
      )}

      {orders.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-muted text-sm">
          Nog geen opdrachten voor deze klant.
        </div>
      ) : (
        <div className="space-y-5">
          {byMonth.map((group) => {
            const gMarge = group.items.reduce((s, o) => s + (o.price - o.editorCost - o.otherCost), 0);
            const gPrijs = group.items.reduce((s, o) => s + o.price, 0);
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-px w-5 bg-accent/60" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">{group.label}</span>
                  </div>
                  <span className="text-[12px] text-muted">
                    {fmtEur(gPrijs)} omzet · <span className="text-emerald-400">{fmtEur(gMarge)} marge</span>
                  </span>
                </div>
                <div className="space-y-3">
          {group.items.map((o) => {
            const marge = o.price - o.editorCost - o.otherCost;
            const margePct = o.price > 0 ? Math.round((marge / o.price) * 100) : 0;
            return (
              <div key={o.id} className="rounded-xl border border-white/[0.07] bg-white/[0.01] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-medium">{o.title}</div>
                    <div className="text-[12px] text-muted">
                      {o.invoiceRef && <span className="text-foreground/70">Factuur {o.invoiceRef}</span>}
                      {o.invoiceRef && o.deadline && " · "}
                      {o.deadline && (
                        <>Deadline: {new Date(o.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={o.status}
                      onChange={(e) => {
                        const status = e.target.value;
                        startTransition(() => {
                          updateOrderStatusAction(o.id, clientId, status);
                        });
                      }}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[12px] outline-none focus:border-accent/40"
                      style={{ color: statusColor[o.status] ?? "#fff" }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-card text-foreground">{s}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Opdracht "${o.title}" verwijderen?`)) {
                          startTransition(() => {
                            deleteOrderAction(o.id, clientId);
                          });
                        }
                      }}
                      className="rounded-lg border border-white/[0.08] hover:border-red-400/40 hover:text-red-400 px-2 py-1 text-[12px] transition-all"
                      title="Verwijderen"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {o.deliverables && (
                  <p className="text-[13px] text-foreground/75 leading-relaxed mb-3">{o.deliverables}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] border-t border-white/[0.05] pt-3">
                  <span className="text-muted">Prijs <strong className="text-foreground">{fmtEur(o.price)}</strong></span>
                  <span className="text-muted">Kosten <strong className="text-foreground">{fmtEur(o.editorCost + o.otherCost)}</strong></span>
                  <span className="ml-auto">
                    <Badge color={marge >= 0 ? "#34D399" : "#F87171"}>
                      marge {fmtEur(marge)} ({margePct}%)
                    </Badge>
                  </span>
                </div>
              </div>
            );
          })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
