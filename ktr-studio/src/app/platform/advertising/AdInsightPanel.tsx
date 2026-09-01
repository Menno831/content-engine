"use client";

// De AI-analyse over de gekozen periode. Wordt bewaard, dus een refresh
// kost geen nieuwe API-call; met de knop maak je een verse analyse.

import { useState, useTransition } from "react";
import { generateAdInsightAction } from "./actions";
import type { AdInsight } from "@/lib/ads-shared";

function Rendered({ body }: { body: string }) {
  // De analyse komt terug met ## kopjes en - opsommingen; die maken we
  // leesbaar zonder een markdown-pakket binnen te halen.
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="space-y-3.5">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="font-display font-bold text-[15px] text-accent pt-1">
              {trimmed.replace(/^##\s*/, "")}
            </h3>
          );
        }
        const lines = trimmed.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5 text-[13.5px] text-foreground/85 leading-relaxed">
                  <span className="text-accent shrink-0">·</span>
                  <span>{l.replace(/^\s*[-*•]\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[13.5px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export function AdInsightPanel({
  insight,
  days,
  clientId,
  hasData,
}: {
  insight: AdInsight | null;
  days: number;
  clientId: string | null;
  hasData: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const r = await generateAdInsightAction(days, clientId);
      if (r.error) setError(r.error);
    });
  }

  const stale =
    insight && new Date(insight.periodEnd) < new Date(new Date().toISOString().slice(0, 10));

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-accent mb-1">Analyse</div>
          <h2 className="font-display font-extrabold text-xl">Wat de cijfers zeggen</h2>
          {insight && (
            <p className="text-[12px] text-muted mt-1">
              Over {insight.periodStart} t/m {insight.periodEnd} · gemaakt op{" "}
              {new Date(insight.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {stale && " · periode is inmiddels opgeschoven"}
            </p>
          )}
        </div>
        <button
          onClick={run}
          disabled={pending || !hasData}
          className="shrink-0 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-2.5 transition-colors"
        >
          {pending ? "Analyseren…" : insight ? "Opnieuw analyseren" : "Analyseer deze periode"}
        </button>
      </div>

      {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}

      {!hasData ? (
        <p className="text-[13.5px] text-muted">
          Er staat nog geen advertentiedata in deze periode. Importeer een CSV of voeg een regel toe —
          daarna kan de analyse draaien.
        </p>
      ) : insight ? (
        <Rendered body={insight.body} />
      ) : (
        <p className="text-[13.5px] text-muted">
          Klik op analyseren: je krijgt per campagne en advertentie wat je zou moeten opschalen, wat je
          zou moeten uitzetten en wat er de moeite waard is om te testen — op basis van deze cijfers,
          niet op onderbuikgevoel.
        </p>
      )}
    </div>
  );
}
