"use client";

// Instellingen voor de automatische kanaal-sync: eigen IG-handle en
// YouTube-kanaal, plus een knop om direct te syncen. De cron draait
// elke ochtend om 07:00 met dezelfde bronnen.

import { useState, useTransition } from "react";
import { Card } from "../_components";
import { saveOwnChannelsAction, syncOwnChannelsAction } from "./actions";

export function AutoSyncCard({
  igHandle,
  ytChannel,
  keys,
}: {
  igHandle: string;
  ytChannel: string;
  keys: { instagram: boolean; youtube: boolean; clarity: boolean };
}) {
  const [ig, setIg] = useState(igHandle);
  const [yt, setYt] = useState(ytChannel);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await saveOwnChannelsAction(ig, yt);
      setMsg(r.error ? { tone: "err", text: r.error } : { tone: "ok", text: "Bronnen opgeslagen." });
    });
  }

  function syncNow() {
    start(async () => {
      const r = await syncOwnChannelsAction();
      if (r.error) setMsg({ tone: "err", text: r.error });
      else {
        const failed = (r.results ?? []).filter((x) => !x.ok);
        const okCount = (r.results ?? []).filter((x) => x.ok).length;
        setMsg(
          failed.length
            ? { tone: "err", text: `${okCount} kanaal/kanalen gesynct; mislukt: ${failed.map((f) => `${f.channel} (${f.error})`).join(", ")}` }
            : okCount
              ? { tone: "ok", text: `${okCount} kanaal/kanalen gesynct — cijfers staan hieronder.` }
              : { tone: "err", text: "Niets gesynct — vul eerst een IG-handle of YouTube-kanaal in." }
        );
      }
    });
  }

  const field =
    "w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] outline-none focus:border-accent/40";
  const dot = (on: boolean) => (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-white/20"}`} />
  );

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <div className="font-display font-extrabold mb-1">Automatisch tracken</div>
          <p className="text-[12px] text-muted">
            Elke ochtend om 07:00 een verse snapshot. LinkedIn kan niet automatisch — die vul je zelf in.
          </p>
        </div>
        <label className="block flex-1 min-w-[150px]">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Eigen IG-handle</span>
          <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@menno.kater" className={field} />
        </label>
        <label className="block flex-1 min-w-[190px]">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1">YouTube-kanaal (URL of @handle)</span>
          <input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="youtube.com/@mennokater" className={field} />
        </label>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-4 py-2 text-[13px] transition-all disabled:opacity-50"
        >
          Opslaan
        </button>
        <button
          onClick={syncNow}
          disabled={pending}
          className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-[13px] px-4 py-2 transition-colors"
        >
          {pending ? "Bezig…" : "↻ Nu syncen"}
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">{dot(keys.instagram)} Instagram-scraper {keys.instagram ? "actief" : "— RAPIDAPI_KEY ontbreekt"}</span>
        <span className="flex items-center gap-1.5">{dot(keys.youtube)} YouTube {keys.youtube ? "actief" : "— wacht op YOUTUBE_API_KEY"}</span>
        <span className="flex items-center gap-1.5">{dot(keys.clarity)} Website (Clarity) {keys.clarity ? "actief" : "— wacht op CLARITY_API_TOKEN"}</span>
      </div>

      {msg && <p className={`mt-2 text-[13px] ${msg.tone === "ok" ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </Card>
  );
}
