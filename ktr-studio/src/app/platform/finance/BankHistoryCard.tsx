"use client";

// Je hele bankjaar in één klik. Moneybird heeft ABN en Revolut al
// gekoppeld en de sleutel staat op de server, dus je hoeft niets te
// delen. Alles wat je zelf al een label gaf blijft staan.

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { fmtEur } from "../_data";
import { importBankHistoryAction } from "./actions";

export function BankHistoryCard({ labeled, oldest }: { labeled: number; oldest: string | null }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const year = new Date().getFullYear();

  function run(from: string, to: string, what: string) {
    setMsg(null);
    start(async () => {
      const r = await importBankHistoryAction(from, to);
      if (!r.ok) setMsg({ ok: false, text: r.error ?? "Ophalen mislukt." });
      else
        setMsg({
          ok: true,
          text: `${what}: ${r.fetched} afschrijvingen gelezen, ${r.labeled} nieuw gesorteerd${r.byAi ? ` (${r.byAi} door de AI)` : ""}.${r.error ? ` Let op: ${r.error}` : ""}`,
        });
    });
  }

  const btn = "rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-1.5 text-[12.5px] text-muted transition-all disabled:opacity-50";

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Bank</Eyebrow>
          <h2 className="font-display font-extrabold text-lg">Je bankgeschiedenis ophalen</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            {labeled > 0
              ? `${labeled} afschrijvingen gesorteerd${oldest ? `, vanaf ${new Date(oldest).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}` : ""}.`
              : "Nog niets opgehaald — haal je jaar op en alles wordt vanzelf gesorteerd in vaste lasten, klantkosten, privé en overig."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={pending} onClick={() => run(`${year}-01-01`, new Date().toISOString().slice(0, 10), `${year}`)} className={btn}>
            {pending ? "Bezig…" : `Heel ${year}`}
          </button>
          <button disabled={pending} onClick={() => run(`${year - 1}-01-01`, `${year - 1}-12-31`, `${year - 1}`)} className={btn}>
            {year - 1}
          </button>
        </div>
      </div>
      {msg && <p className={`text-[13px] mt-3 ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      <p className="text-[11.5px] text-muted mt-2">
        Labels die je zelf zette blijven staan. Wat de AI niet zeker weet blijft in de triage hieronder.
      </p>
    </Card>
  );
}
