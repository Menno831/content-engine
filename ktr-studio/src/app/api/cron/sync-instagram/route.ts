import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncClientInstagram } from "@/lib/sync/instagram";

// Nachtelijke sync van alle klanten (Vercel Cron). Beveiligd met CRON_SECRET.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "geen serverkey" }, { status: 503 });

  // Klanten met een mogelijke IG-bron (handle óf koppeling).
  const { data: clients } = await admin.from("clients").select("id, ig_handle");
  const results: { client: string; ok: boolean; items?: number; error?: string }[] = [];

  for (const c of clients ?? []) {
    const r = await syncClientInstagram(c.id);
    // Sla klanten zonder bron stil over (geen ruis).
    if (!r.ok && r.error === "geen_bron") continue;
    results.push({ client: c.id, ok: r.ok, items: r.items, error: r.error });
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), synced: results.length, results });
}
