"use client";

import { useState, useTransition } from "react";
import { syncAllClientsAction } from "./actions";

export function SyncAllButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncAllClientsAction();
      setMsg(r.ok ? `${r.synced}/${r.total} gesynct` : r.error ?? "fout");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[12px] text-muted">{msg}</span>}
      <button
        onClick={run}
        disabled={pending}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-50 px-4 py-2.5 text-sm transition-all"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={pending ? "animate-spin" : ""}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
        </svg>
        {pending ? "Bezig…" : "Sync alles"}
      </button>
    </div>
  );
}
