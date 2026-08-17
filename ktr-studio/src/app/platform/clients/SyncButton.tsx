"use client";

import { useState, useTransition } from "react";
import { syncClientAction } from "./actions";

const errorLabels: Record<string, string> = {
  geen_bron: "Geen IG-handle of YouTube-kanaal",
  geen_serverkey: "Serverkey ontbreekt",
  not_configured: "RAPIDAPI_KEY ontbreekt — zet 'm in Vercel",
  not_found: "Profiel niet gevonden of privé",
  "auth vereist": "Log opnieuw in",
};

// Vertaalt ook ruwe API-fouten (bv. "profile: 403") naar mensentaal.
function labelFor(raw: string): string {
  if (errorLabels[raw]) return errorLabels[raw];
  if (/40[13]/.test(raw)) return "RapidAPI: geen toegang of abonnement (403)";
  if (/429/.test(raw)) return "RapidAPI: limiet bereikt — wacht even (429)";
  if (/5\d\d/.test(raw)) return "RapidAPI tijdelijk down — probeer zo opnieuw";
  if (/not_found/i.test(raw)) return "Profiel niet gevonden of privé";
  return raw;
}

export function SyncButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncClientAction(clientId);
      if (r.ok) {
        // Bij 0 items is de diagnose belangrijker dan het aantal: laat zien
        // wat elk endpoint teruggaf (bv. "posts: 403" = abonnement dekt dat niet).
        const diag = (r.items ?? 0) === 0 && r.detail ? ` — ${r.detail}` : "";
        setMsg({ ok: true, text: `Gesynct · ${r.items ?? 0} items${diag}` });
      } else {
        setMsg({ ok: false, text: labelFor(r.error ?? "fout") });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className={`text-[11px] ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </span>
      )}
      <button
        onClick={run}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-50 px-2.5 py-1.5 text-[12px] transition-all"
      >
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={pending ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
        </svg>
        {pending ? "Bezig…" : "Sync"}
      </button>
    </div>
  );
}
