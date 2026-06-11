import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncClientAll } from "@/lib/sync/client";

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

  return NextResponse.json({ ranAt: new Date().toISOString(), synced: results.length, results });
}
