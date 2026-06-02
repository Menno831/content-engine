"use client";

import { useState, useTransition } from "react";
import { syncClientAction } from "./actions";

const errorLabels: Record<string, string> = {
  geen_bron: "Geen IG-handle of koppeling",
  geen_serverkey: "Serverkey ontbreekt",
  not_configured: "Bron niet geconfigureerd",
  not_found: "Profiel niet gevonden",
  "auth vereist": "Log opnieuw in",
};

export function SyncButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncClientAction(clientId);
      if (r.ok) {
        setMsg({ ok: true, text: `Gesynct · ${r.items ?? 0} items` });
      } else {
        const e = r.error ?? "fout";
        setMsg({ ok: false, text: errorLabels[e] ?? e });
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
