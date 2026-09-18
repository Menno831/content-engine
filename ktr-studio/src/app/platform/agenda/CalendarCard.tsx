"use client";

// Google Agenda koppelen via het geheime iCal-adres — geen inlog, geen
// review. Daarna elke ochtend automatisch, en op knopdruk nu.

import { useState, useTransition } from "react";
import { Card } from "../_components";
import { saveCalendarUrlAction, importCalendarAction } from "./actions";

export function CalendarCard({ icsUrl, syncedAt, manualCount = 0 }: { icsUrl: string; syncedAt: string | null; manualCount?: number }) {
  const [url, setUrl] = useState(icsUrl);
  const [open, setOpen] = useState(!icsUrl);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveCalendarUrlAction(url);
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        const i = await importCalendarAction();
        setMsg(i.error ? { ok: false, text: i.error } : { ok: true, text: `Gekoppeld — ${i.imported ?? 0} afspraken ingelezen.` });
        if (!i.error) setOpen(false);
      }
    });
  }

  function importNow() {
    setMsg(null);
    start(async () => {
      const r = await importCalendarAction();
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `${r.imported ?? 0} afspraken bijgewerkt${r.removed ? `, ${r.removed} geannuleerde weggehaald` : ""}.` });
    });
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display font-extrabold">Google Agenda</div>
          <p className="text-[12px] text-muted mt-0.5">
            {icsUrl
              ? `Gekoppeld · elke ochtend automatisch${syncedAt ? ` · laatst ${new Date(syncedAt).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`
              : manualCount > 0
                ? `${manualCount} afspraken staan erin, eenmalig ingelezen — koppel het geheime adres en het werkt elke ochtend vanzelf bij.`
                : "Nog niet gekoppeld — twee minuten werk, daarna zie je hier en op het dashboard wat er vandaag staat en wat gedaan is."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {icsUrl && (
            <button onClick={importNow} disabled={pending} className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-[13px] px-4 py-2 transition-colors">
              {pending ? "Bezig…" : "↻ Nu importeren"}
            </button>
          )}
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3.5 py-2 text-[13px] transition-all">
            {open ? "Sluiten" : icsUrl ? "Adres wijzigen" : "Koppelen"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <ol className="text-[13px] text-foreground/85 space-y-1 mb-3 list-decimal pl-5">
            <li>Open <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">Google Agenda → Instellingen</a> en klik links op je agenda.</li>
            <li>Scroll naar <strong>Agenda integreren</strong> → kopieer het <strong>geheime adres in iCal-indeling</strong>.</li>
            <li>Plak het hieronder. Dit adres is privé: deel het met niemand.</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/…/private-…/basic.ics"
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] font-mono outline-none focus:border-accent/40"
            />
            <button onClick={save} disabled={pending || !url.trim()} className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-[13px] px-4 py-2 transition-colors">
              {pending ? "Koppelen…" : "Opslaan & importeren"}
            </button>
          </div>
        </div>
      )}
      {msg && <p className={`mt-3 text-[13px] ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </Card>
  );
}
