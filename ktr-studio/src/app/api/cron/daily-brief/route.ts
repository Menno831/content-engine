import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBriefForClient } from "@/lib/brief";

// Dagelijkse brief voor alle actieve klanten (Vercel Cron). Beveiligd
// met CRON_SECRET. Idempotent: draait 'ie twee keer, dan slaat 'ie
// klanten over die vandaag al een brief hebben.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "geen serverkey" }, { status: 503 });

  // Per agency de actieve klanten ophalen.
  const { data: clients } = await admin
    .from("clients")
    .select("id, agency_id, status")
    .neq("status", "gepauzeerd");

  const results: { client: string; created: number; error?: string }[] = [];
  for (const c of clients ?? []) {
    const r = await generateBriefForClient(admin, c.agency_id as string, c.id as string);
    if (r.skipped) continue;
    results.push({ client: c.id as string, created: r.created, error: r.error });
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), briefs: results.length, results });
}
