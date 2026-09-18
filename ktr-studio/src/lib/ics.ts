// ════════════════════════════════════════════════════════════════
// Kleine iCal-lezer voor het geheime adres van Google Agenda. Leest
// VEVENTs, begrijpt hele-dag-events, tijdzones en de gangbare
// herhalingen (dagelijks/wekelijks met BYDAY, INTERVAL, UNTIL, COUNT,
// EXDATE) en levert losse afspraken in een venster op. Geen
// bibliotheek: we hebben maar één agenda-formaat nodig.
// ════════════════════════════════════════════════════════════════

export interface IcsEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  description: string | null;
  attendees: string[];
  cancelled: boolean;
}

// Vouwregels uit (RFC 5545: vervolgregels beginnen met spatie/tab).
function unfold(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
}

// Tijdzone-offset zonder bibliotheek: UTC-tijdstip zó kiezen dat het
// in de gegeven zone op de opgegeven wandkloktijd valt.
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const asIf = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return new Date(guess - (asIf - guess));
  } catch {
    return new Date(guess);
  }
}

function parseDt(value: string, params: Record<string, string>, defaultTz: string): { date: Date; allDay: boolean } {
  const v = value.trim();
  if (params.VALUE === "DATE" || /^\d{8}$/.test(v)) {
    const y = +v.slice(0, 4), mo = +v.slice(4, 6), d = +v.slice(6, 8);
    // Hele dag: als lokale middernacht in de standaardzone.
    return { date: zonedToUtc(y, mo, d, 0, 0, 0, defaultTz), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return { date: new Date(NaN), allDay: false };
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0))), allDay: false };
  return { date: zonedToUtc(+y, +mo, +d, +h, +mi, +(s ?? 0), params.TZID || defaultTz), allDay: false };
}

interface Raw {
  props: Record<string, { value: string; params: Record<string, string> }[]>;
}

function parseBlocks(lines: string[]): { tz: string; events: Raw[] } {
  const events: Raw[] = [];
  let cur: Raw | null = null;
  let tz = "Europe/Amsterdam";
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = { props: {} }; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [name, ...paramParts] = left.split(";");
    const params: Record<string, string> = {};
    for (const p of paramParts) { const [k, v] = p.split("="); if (k && v) params[k.toUpperCase()] = v.replace(/^"|"$/g, ""); }
    if (!cur) {
      if (name === "X-WR-TIMEZONE" && value) tz = value.trim();
      continue;
    }
    (cur.props[name.toUpperCase()] ??= []).push({ value, params });
  }
  return { tz, events };
}

const DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const unescape = (s: string) => s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\");

/** Alle losse afspraken in [from, to], herhalingen uitgeschreven. */
export function parseIcs(text: string, from: Date, to: Date): IcsEvent[] {
  const { tz, events } = parseBlocks(unfold(text));
  const out: IcsEvent[] = [];
  // Uitzonderingen op herhalingen (RECURRENCE-ID) verdringen de gegenereerde instantie.
  const overridden = new Set<string>();
  for (const e of events) {
    const rid = e.props["RECURRENCE-ID"]?.[0];
    const uid = e.props.UID?.[0]?.value;
    if (rid && uid) overridden.add(`${uid}|${parseDt(rid.value, rid.params, tz).date.toISOString()}`);
  }

  for (const e of events) {
    const p = e.props;
    const uid = p.UID?.[0]?.value ?? "";
    const title = unescape(p.SUMMARY?.[0]?.value ?? "(zonder titel)");
    const ds = p.DTSTART?.[0];
    if (!uid || !ds) continue;
    const start = parseDt(ds.value, ds.params, tz);
    if (isNaN(start.date.getTime())) continue;
    const de = p.DTEND?.[0];
    let end = de ? parseDt(de.value, de.params, tz).date : new Date(start.date.getTime() + (start.allDay ? 86_400_000 : 30 * 60_000));
    if (p.DURATION?.[0] && !de) {
      const m = p.DURATION[0].value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
      if (m) end = new Date(start.date.getTime() + ((+(m[1] ?? 0)) * 86_400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60) * 1000);
    }
    const dur = end.getTime() - start.date.getTime();
    const cancelled = (p.STATUS?.[0]?.value ?? "").toUpperCase() === "CANCELLED";
    const description = p.DESCRIPTION?.[0]?.value ? unescape(p.DESCRIPTION[0].value).slice(0, 2000) : null;
    const attendees = (p.ATTENDEE ?? []).map((a) => a.params.CN || a.value.replace(/^mailto:/i, "")).filter(Boolean);
    const exdates = new Set((p.EXDATE ?? []).flatMap((x) => x.value.split(",").map((v) => parseDt(v, x.params, tz).date.toISOString())));
    const recurrenceId = p["RECURRENCE-ID"]?.[0];

    const push = (s: Date) => {
      if (s > to || new Date(s.getTime() + dur) < from) return;
      const key = `${uid}|${s.toISOString()}`;
      if (!recurrenceId && overridden.has(key)) return;
      if (exdates.has(s.toISOString())) return;
      out.push({ uid: recurrenceId ? `${uid}@${s.toISOString()}` : s.getTime() === start.date.getTime() ? uid : `${uid}@${s.toISOString()}`, title, start: s, end: new Date(s.getTime() + dur), allDay: start.allDay, description, attendees, cancelled });
    };

    const rrule = p.RRULE?.[0]?.value;
    if (!rrule || recurrenceId) { push(start.date); continue; }

    const rule = Object.fromEntries(rrule.split(";").map((kv) => kv.split("=") as [string, string]));
    const freq = rule.FREQ;
    const interval = Math.max(1, +(rule.INTERVAL ?? 1));
    const until = rule.UNTIL ? parseDt(rule.UNTIL, {}, tz).date : null;
    let count = rule.COUNT ? +rule.COUNT : Infinity;
    const hardEnd = until && until < to ? until : to;

    if (freq === "DAILY") {
      for (let t = start.date.getTime(), n = 0; t <= hardEnd.getTime() && n < count && n < 2000; t += interval * 86_400_000, n++) push(new Date(t));
    } else if (freq === "WEEKLY") {
      const days = (rule.BYDAY ? rule.BYDAY.split(",").map((d) => DOW[d.slice(-2)]) : [start.date.getUTCDay()]).filter((d) => d != null);
      // Week-anker: de zondag van de startweek (in UTC — goed genoeg voor
      // wekelijkse afspraken; de tijd zelf komt uit DTSTART).
      const anchor = new Date(start.date); anchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
      for (let w = 0, n = 0; n < count && w < 520; w += interval) {
        const weekStart = new Date(anchor.getTime() + w * 7 * 86_400_000);
        if (weekStart > hardEnd) break;
        for (const d of [...days].sort()) {
          const s = new Date(weekStart.getTime() + d * 86_400_000);
          if (s < start.date) continue;
          if (s > hardEnd) break;
          if (n >= count) break;
          n++; push(s);
        }
      }
    } else if (freq === "MONTHLY" || freq === "YEARLY") {
      // Zelfde dag van de maand/jaar — dekt de meeste verjaardagen en maandcalls.
      for (let n = 0; n < count && n < 120; n++) {
        const s = new Date(start.date);
        if (freq === "MONTHLY") s.setUTCMonth(s.getUTCMonth() + n * interval); else s.setUTCFullYear(s.getUTCFullYear() + n * interval);
        if (s > hardEnd) break;
        push(s);
      }
    } else {
      push(start.date);
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
