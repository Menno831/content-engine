"use client";

// De analyse over je eigen kanalen: wat werkt, wat we moeten fixen,
// wat deze week. Wordt bewaard; de knop maakt een verse.

import { useState, useTransition } from "react";
import { analyzeChannelsAction } from "./actions";

export function AnalysisCard({ body, createdAt }: { body: string | null; createdAt: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const r = await analyzeChannelsAction();
      if (r.error) setError(r.error);
    });
  }

  const blocks = (body ?? "").split(/\n{2,}/).filter((b) => b.trim());

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/[0.03] p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-accent mb-1">Analyse</div>
          <h2 className="font-display font-extrabold text-xl">Wat we moeten fixen</h2>
          {createdAt && (
            <p className="text-[12px] text-muted mt-1">
              Gemaakt {new Date(createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · elke maandag automatisch opnieuw
            </p>
          )}
        </div>
        <button
          onClick={run}
          disabled={pending}
          className="shrink-0 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-2.5 transition-colors"
        >
          {pending ? "Analyseren…" : body ? "Opnieuw analyseren" : "Analyseer mijn kanalen"}
        </button>
      </div>
      {error && <p className="text-[13px] text-red-400 mb-3">{error}</p>}
      {!body ? (
        <p className="text-[13.5px] text-muted">
          Klik op analyseren: je krijgt per kanaal wat werkt, wat je moet fixen en drie acties voor deze week — op basis van je echte metingen en de check van je website.
        </p>
      ) : (
        <div className="space-y-3.5">
          {blocks.map((block, i) => {
            const t = block.trim();
            if (t.startsWith("## ")) return <h3 key={i} className="font-display font-bold text-[15px] text-accent pt-1">{t.replace(/^##\s*/, "")}</h3>;
            const lines = t.split("\n");
            if (lines.every((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l)))
              return (
                <ul key={i} className="space-y-1.5">
                  {lines.map((l, j) => (
                    <li key={j} className="flex gap-2.5 text-[13.5px] text-foreground/85 leading-relaxed">
                      <span className="text-accent shrink-0">·</span>
                      <span>{l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")}</span>
                    </li>
                  ))}
                </ul>
              );
            return <p key={i} className="text-[13.5px] text-foreground/85 leading-relaxed whitespace-pre-wrap">{t}</p>;
          })}
        </div>
      )}
    </div>
  );
}
