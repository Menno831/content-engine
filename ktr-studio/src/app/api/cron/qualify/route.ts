// ════════════════════════════════════════════════════════════════
// Kwalificatie-run: beoordeelt te-contacteren-prospects in batches.
// Afvallers (geen high-ticket aanbod, of YouTube draait al top) gaan
// naar stage 'afgekeurd' met de reden erbij; de rest krijgt een
// fit-label. Toplaag-prospects (handmatig gekozen) slaan we over.
// Aanroepen tot remaining 0 is (max ~20 per call i.v.m. tijd).
// ════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { qualifyProspect } from "@/lib/qualify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "geen serverkey" }, { status: 503 });

  // ?top=1 pakt juist de toplaag (los aan te roepen; die is klein).
  const topOnly = request.nextUrl.searchParams.get("top") === "1";
  let query = admin
    .from("prospects")
    .select("id, name, instagram, youtube, weakness, note")
    .eq("stage", "te_contacteren")
    .is("fit_checked_at", null)
    .limit(20);
  query = topOnly ? query.eq("tier", "top") : query.or("tier.is.null,tier.neq.top");
  const { data: batch } = await query;

  let goed = 0, onbekend = 0, afgekeurd = 0;
  const errors: string[] = [];
  for (const p of batch ?? []) {
    try {
      const fit = await qualifyProspect(p);
      // Technische storing: niets wegschrijven, volgende run opnieuw.
      if (fit.verdict === "onbekend") { onbekend += 1; continue; }
      const patch: Record<string, unknown> = {
        fit_reason: fit.reason,
        fit_checked_at: new Date().toISOString(),
      };
      // Alleen een zeker high-ticket aanbod blijft; twijfel gaat er ook uit.
      if (fit.verdict !== "goed") {
        patch.stage = "afgekeurd";
        patch.tier = null; // afgekeurd hoort nergens een ster te hebben
        afgekeurd += 1;
      } else goed += 1;
      await admin.from("prospects").update(patch).eq("id", p.id);
    } catch (e) {
      errors.push(`${p.name}: ${e instanceof Error ? e.message : "onbekend"}`);
    }
  }

  let remQuery = admin
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("stage", "te_contacteren")
    .is("fit_checked_at", null);
  remQuery = topOnly ? remQuery.eq("tier", "top") : remQuery.or("tier.is.null,tier.neq.top");
  const { count: remaining } = await remQuery;

  return NextResponse.json({ ok: true, processed: (batch ?? []).length, goed, onbekend, afgekeurd, remaining: remaining ?? 0, errors });
}
