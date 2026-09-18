import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { importMetaAds, isMetaAdsConfigured } from "@/lib/metaAds";

// Haalt de Meta-advertentiecijfers per dag per advertentie op en zet ze in
// ad_entries, zodat de hele advertentiepagina zichzelf vult. Dezelfde import
// zit achter de "Sync nu"-knop op de advertentiepagina.
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
  const r = await importMetaAds(admin, days);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
