import { NextRequest, NextResponse } from "next/server";
import { syncOwnChannelsCore } from "@/lib/sync/channels";

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
  return NextResponse.json({ ok: true, results });
}
