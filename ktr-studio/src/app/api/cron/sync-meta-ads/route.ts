import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMetaAdEntries, isMetaAdsConfigured } from "@/lib/metaAds";

// Haalt de Meta-advertentiecijfers per dag per advertentie op en zet ze in
// ad_entries, zodat de hele advertentiepagina zichzelf vult. Meta corrigeert
// zijn cijfers nog dagen na, dus we halen standaard 30 dagen opnieuw op en
// vervangen die periode in plaats van bij te tellen.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isMetaAdsConfigured) {
    return NextResponse.json({ ok: false, reason: "geen_meta_sleutels" });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "geen serverkey" }, { status: 503 });

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("dagen") ?? 30)));

  let entries;
  try {
    entries = await getMetaAdEntries(days);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "onbekend" },
      { status: 502 }
    );
  }
  if (!entries.length) return NextResponse.json({ ok: true, entries: 0 });

  const { data: agency } = await admin.from("agencies").select("id").limit(1).single();
  const agencyId = agency?.id ?? null;

  const from = entries.reduce((a, e) => (e.date < a ? e.date : a), entries[0].date);
  const to = entries.reduce((a, e) => (e.date > a ? e.date : a), entries[0].date);

  // Eerst de eigen eerdere import van deze periode weg, anders telt een
  // herhaalde run dubbel. Handmatige regels blijven staan.
  const del = await admin
    .from("ad_entries")
    .delete()
    .eq("source", "meta")
    .gte("date", from)
    .lte("date", to);
  if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });

  const rows = entries.map((e) => ({ ...e, agency_id: agencyId, content_id: null, revenue: 0, client_id: null }));
  const ins = await admin.from("ad_entries").insert(rows);
  if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, entries: rows.length, from, to });
}
