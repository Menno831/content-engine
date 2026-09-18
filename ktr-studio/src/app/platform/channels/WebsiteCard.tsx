"use client";

// Laatste check van de eigen website: bereikbaar, snelheid en de
// dingen die je zelf ook zou nakijken. Knop doet 'm nu.

import { useState, useTransition } from "react";
import { Card } from "../_components";
import { checkSiteAction } from "./actions";

export interface SiteCheckRow {
  url: string;
  ok: boolean;
  status: number | null;
  ms: number | null;
  title: string | null;
  description: string | null;
  issues: string[];
  checkedAt: string;
}

export function WebsiteCard({ check, website }: { check: SiteCheckRow | null; website: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#60A5FA" }} />
            <span className="font-display font-extrabold text-lg">Website-check</span>
            {check && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${check.ok && check.issues.length === 0 ? "bg-emerald-400/15 text-emerald-400" : check.ok ? "bg-amber-400/15 text-amber-300" : "bg-red-400/15 text-red-400"}`}>
                {check.ok ? (check.issues.length === 0 ? "alles goed" : `${check.issues.length} ${check.issues.length === 1 ? "punt" : "punten"}`) : "niet bereikbaar"}
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted mt-1">
            {website ? (
              <>
                {website}
                {check && ` · laatst gecheckt ${new Date(check.checkedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
              </>
            ) : (
              "Vul hierboven je website in — dan checken we 'm elke ochtend mee."
            )}
          </p>
        </div>
        {website && (
          <button
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await checkSiteAction();
                if (r.error) setError(r.error);
              });
            }}
            disabled={pending}
            className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-50 px-3.5 py-2 text-[13px] transition-all"
          >
            {pending ? "Checken…" : "↻ Check nu"}
          </button>
        )}
      </div>
      {error && <p className="text-[13px] text-red-400 mb-2">{error}</p>}
      {check && (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] mb-3">
            <span><span className="text-muted">status</span> {check.status ?? "—"}</span>
            <span><span className="text-muted">responstijd</span> {check.ms != null ? `${check.ms} ms` : "—"}</span>
            <span className="truncate max-w-[420px]"><span className="text-muted">titel</span> {check.title ?? "—"}</span>
          </div>
          {check.issues.length > 0 ? (
            <ul className="space-y-1">
              {check.issues.map((i, k) => (
                <li key={k} className="flex gap-2 text-[13px] text-foreground/85">
                  <span className="text-amber-300 shrink-0">!</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-emerald-400">Bereikbaar, snel genoeg, titel en omschrijving staan, mobiel en preview-afbeelding kloppen.</p>
          )}
        </>
      )}
    </Card>
  );
}
