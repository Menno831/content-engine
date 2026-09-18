// ════════════════════════════════════════════════════════════════
// Google Agenda → meetings. Leest het geheime iCal-adres, neemt een
// venster van twee weken terug tot zes weken vooruit, en zet elke
// afspraak idempotent in `meetings` (external_id = uid). Afspraken die
// voorbij zijn krijgen 'gehouden' als er nog niets ingevuld was —
// zo zie je 's avonds wat er gedaan is. Geannuleerd in Google =
// weg uit de lijst.
// ════════════════════════════════════════════════════════════════
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIcs } from "@/lib/ics";

export interface CalendarSyncResult {
  ok: boolean;
  imported?: number;
  removed?: number;
  error?: string;
}

export async function importCalendar(db: SupabaseClient, agencyId: string): Promise<CalendarSyncResult> {
  const { data: a } = await db.from("agencies").select("calendar_ics_url").eq("id", agencyId).maybeSingle();
  const url = (a?.calendar_ics_url as string | null)?.trim();
  if (!url) return { ok: false, error: "Geen agenda-adres ingesteld." };

  let text: string;
  try {
    const res = await fetch(url.replace(/^webcal:\/\//i, "https://"), { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { ok: false, error: `Google gaf ${res.status} — klopt het geheime adres nog?` };
    text = await res.text();
  } catch (e) {
    return { ok: false, error: `Agenda niet bereikbaar (${e instanceof Error ? e.message : "fout"}).` };
  }
  if (!/BEGIN:VCALENDAR/.test(text)) return { ok: false, error: "Dit is geen iCal-bestand — gebruik het 'geheime adres in iCal-indeling'." };

  const now = new Date();
  const from = new Date(now.getTime() - 14 * 86_400_000);
  const to = new Date(now.getTime() + 45 * 86_400_000);
  const events = parseIcs(text, from, to);

  // Klantnamen matchen op titel/deelnemers, zodat een call meteen bij de
  // juiste klant hangt (bv. "Sync - Jip & Menno" → Jip Geuke).
  const { data: clients } = await db.from("clients").select("id,name").eq("agency_id", agencyId);
  const clientFor = (title: string, attendees: string[]) => {
    const hay = `${title} ${attendees.join(" ")}`.toLowerCase();
    for (const c of clients ?? []) {
      const first = String(c.name).split(/\s+/)[0]?.toLowerCase();
      if (first && first.length >= 3 && hay.includes(first)) return c.id as string;
    }
    return null;
  };

  const cancelledIds = events.filter((e) => e.cancelled).map((e) => e.uid);
  let removed = 0;
  if (cancelledIds.length) {
    const { data } = await db.from("meetings").delete().eq("agency_id", agencyId).in("external_id", cancelledIds).select("id");
    removed = data?.length ?? 0;
  }

  const live = events.filter((e) => !e.cancelled);
  const { data: existing } = await db.from("meetings").select("external_id,outcome,client_id").eq("agency_id", agencyId).in("external_id", live.map((e) => e.uid));
  const known = new Map((existing ?? []).map((m) => [String(m.external_id), m]));

  const rows = live.map((e) => {
    const prev = known.get(e.uid);
    const past = e.end < now;
    // Eigen oordeel (no-show, verzet) nooit overschrijven; alleen 'gepland' → 'gehouden' na afloop.
    const outcome = prev?.outcome && prev.outcome !== "gepland" ? prev.outcome : past ? "gehouden" : "gepland";
    return {
      agency_id: agencyId,
      external_id: e.uid,
      source: "google",
      title: e.title,
      starts_at: e.start.toISOString(),
      ends_at: e.end.toISOString(),
      duration: Math.max(5, Math.round((e.end.getTime() - e.start.getTime()) / 60_000)),
      attendees: e.attendees.length ? e.attendees.join(", ") : null,
      notes: e.description,
      outcome,
      client_id: (prev?.client_id as string | null) ?? clientFor(e.title, e.attendees),
    };
  });

  let imported = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await db.from("meetings").upsert(chunk, { onConflict: "agency_id,external_id" });
    if (error) return { ok: false, error: error.message, imported };
    imported += chunk.length;
  }

  await db.from("agencies").update({ calendar_synced_at: now.toISOString() }).eq("id", agencyId);
  return { ok: true, imported, removed };
}
