import { NextRequest, NextResponse } from "next/server";
import { runWatchdog } from "@/lib/watchdog";

export const maxDuration = 120; // AI-calls + scraper kunnen even duren
export const dynamic = "force-dynamic"; // nooit prerenderen: dit is een actie, geen pagina

// De ochtend-bewaker: signaleringen, concept-DM's en (op maandag)
// de wekelijkse groeianalyse. Zie lib/watchdog.ts.
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
  const result = await runWatchdog();
  return NextResponse.json({ ok: true, ...result });
}
