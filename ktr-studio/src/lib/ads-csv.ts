// ════════════════════════════════════════════════════════════════
// CSV uit een advertentieplatform omzetten naar losse regels.
// Pure functies, geen server-imports: het scherm gebruikt ze voor de
// voorvertoning en de server voor het opslaan, zodat wat je ziet
// precies is wat er wordt weggeschreven.
//
// Kolomnamen verschillen per platform én per taal, dus we herkennen
// ze op sleutelwoorden in plaats van op een exacte match.
// ════════════════════════════════════════════════════════════════

export interface ParsedAdRow {
  date: string;
  campaign: string | null;
  adset: string | null;
  creative: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  results: number;
  revenue: number;
  externalId: string | null;
}

export interface ParseReport {
  rows: ParsedAdRow[];
  skipped: number;
  headers: string[];
  matched: Record<string, string | null>;
  error?: string;
}

/** Splitst een CSV-regel en respecteert velden tussen aanhalingstekens. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Eerste kolom waarvan de naam een van de sleutelwoorden bevat. */
function findCol(headers: string[], words: string[], avoid: string[] = []): string | null {
  for (const w of words) {
    const hit = headers.find((h) => {
      const n = norm(h);
      return n.includes(w) && !avoid.some((a) => n.includes(a));
    });
    if (hit) return hit;
  }
  return null;
}

/** "1.234,56" en "1,234.56" komen allebei voor — beide moeten kloppen. */
export function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  let s = raw.replace(/[^\d,.-]/g, "").trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Datums uit exports: 2026-08-01, 01-08-2026, 01/08/2026. */
export function toDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().slice(0, 10);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function parseAdCsv(text: string): ParseReport {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], skipped: 0, headers: [], matched: {}, error: "Plak de kopregel én minstens één regel data." };
  }

  // Puntkomma of komma als scheidingsteken — Excel in NL levert vaak ;
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitLine(lines[0], sep);

  const matched = {
    date: findCol(headers, ["day", "dag", "datum", "date", "reportingstarts"]),
    campaign: findCol(headers, ["campaign", "campagne"]),
    adset: findCol(headers, ["adsetname", "advertentieset", "adgroup", "advertentiegroep"]),
    creative: findCol(headers, ["adname", "advertentienaam", "creative", "advertentie"], ["set", "groep", "group", "campagne", "campaign"]),
    impressions: findCol(headers, ["impression", "vertoning", "weergave"]),
    clicks: findCol(headers, ["linkclick", "linkklik", "clicks", "klikken"]),
    spend: findCol(headers, ["amountspent", "uitgegeven", "spend", "kosten", "cost"]),
    results: findCol(headers, ["results", "resultaten", "leads", "conversie", "conversion"], ["value", "waarde", "rate", "kosten", "cost"]),
    revenue: findCol(headers, ["conversionvalue", "purchasevalue", "conversiewaarde", "omzet", "revenue", "opbrengst"]),
    externalId: findCol(headers, ["adid", "advertentieid", "reportid"]),
  };

  if (!matched.date) {
    return { rows: [], skipped: 0, headers, matched, error: "Geen datumkolom gevonden — zorg dat de export per dag is uitgesplitst." };
  }
  if (!matched.spend) {
    return { rows: [], skipped: 0, headers, matched, error: "Geen kolom met uitgaven gevonden (bv. 'Amount spent' of 'Uitgegeven bedrag')." };
  }

  const idx = (name: string | null) => (name ? headers.indexOf(name) : -1);
  const get = (cells: string[], name: string | null) => {
    const i = idx(name);
    return i >= 0 ? cells[i] : undefined;
  };

  const rows: ParsedAdRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitLine(line, sep);
    const date = toDate(get(cells, matched.date));
    if (!date) {
      skipped++;
      continue;
    }
    const row: ParsedAdRow = {
      date,
      campaign: get(cells, matched.campaign)?.trim() || null,
      adset: get(cells, matched.adset)?.trim() || null,
      creative: get(cells, matched.creative)?.trim() || null,
      impressions: Math.round(toNumber(get(cells, matched.impressions))),
      clicks: Math.round(toNumber(get(cells, matched.clicks))),
      spend: toNumber(get(cells, matched.spend)),
      results: Math.round(toNumber(get(cells, matched.results))),
      revenue: toNumber(get(cells, matched.revenue)),
      externalId: get(cells, matched.externalId)?.trim() || null,
    };
    // Een regel zonder enige activiteit voegt niets toe.
    if (row.spend === 0 && row.impressions === 0 && row.clicks === 0 && row.results === 0) {
      skipped++;
      continue;
    }
    rows.push(row);
  }

  return { rows, skipped, headers, matched };
}
