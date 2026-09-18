// Scrape + YouTube + Clarity per agency kan lang duren.
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { syncOwnChannelsCore } from "@/lib/sync/channels";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeChannels } from "@/lib/channel-analysis";
import { importCalendar } from "@/lib/sync/calendar";

// Dagelijkse snapshot van de eigen kanalen (Vercel Cron, 07:00).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    // Zonder secret zou dit endpoint publiek aanroepbaar zijn (en AI-kosten
    // maken) — dicht laten tot de secret in Vercel staat.
    return NextResponse.json({ ok: false, error: "CRON_SECRET niet geconfigureerd — endpoint staat dicht." }, { status: 503 });
  }
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await syncOwnChannelsCore();

  // Google Agenda: elke ochtend de komende weken verversen en wat voorbij
  // is op 'gehouden' zetten.
  const calendar: { agency: string; ok: boolean; imported?: number; error?: string }[] = [];
  {
    const admin = createAdminClient();
    if (admin) {
      const { data: agencies } = await admin.from("agencies").select("id, calendar_ics_url");
      for (const a of agencies ?? []) {
        if (!a.calendar_ics_url) continue;
        const r = await importCalendar(admin, a.id as string).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : "fout" }));
        calendar.push({ agency: a.id as string, ok: r.ok, imported: "imported" in r ? r.imported : undefined, error: r.error });
      }
    }
  }

  // Elke maandag na de sync: verse analyse per agency, zodat de week
  // begint met "dit moeten we fixen" in plaats van een tabel cijfers.
  let analyzed = 0;
  if (new Date().getUTCDay() === 1) {
    const admin = createAdminClient();
    if (admin) {
      const { data: agencies } = await admin.from("agencies").select("id");
      for (const a of agencies ?? []) {
        const r = await analyzeChannels(admin, a.id as string).catch(() => ({ ok: false }));
        if (r.ok) analyzed++;
      }
    }
  }
  return NextResponse.json({ ok: true, results, calendar, analyzed });
}
