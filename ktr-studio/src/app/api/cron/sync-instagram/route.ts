import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncClientAll } from "@/lib/sync/client";
import { syncCompetitorCore } from "@/lib/sync/competitors";

// Nachtelijke sync van alle klanten (Vercel Cron). Beveiligd met CRON_SECRET.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "geen serverkey" }, { status: 503 });

  // Alle klanten — syncClientAll slaat ontbrekende bronnen zelf over.
  const { data: clients } = await admin.from("clients").select("id");
  const results: { client: string; ok: boolean; items?: number; error?: string }[] = [];

  for (const c of clients ?? []) {
    const r = await syncClientAll(c.id);
    // Sla klanten zonder enige bron stil over (geen ruis).
    if (!r.ok && r.error === "geen_bron") continue;
    results.push({ client: c.id, ok: r.ok, items: r.items, error: r.error });
  }

  // Ook gevolgde competitors verversen (Discover outlier-detectie blijft actueel).
  const { data: comps } = await admin.from("competitors").select("id");
  let competitorsSynced = 0;
  for (const c of comps ?? []) {
    const r = await syncCompetitorCore(c.id);
    if (r.ok) competitorsSynced++;
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    synced: results.length,
    competitors: competitorsSynced,
    results,
  });
}
