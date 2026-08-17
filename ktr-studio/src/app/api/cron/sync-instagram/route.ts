import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncClientAll } from "@/lib/sync/client";
import { syncCompetitorCore } from "@/lib/sync/competitors";
import { getMoneybirdMonth, moneybirdConfigured } from "@/lib/integrations/moneybird";
import { fmtEur } from "@/app/platform/_data";

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

  // ── Dagelijkse outreach-herinnering (alleen de ochtendrun, 10:00 NL) ──
  // De cron draait 3x per dag; alleen de eerste run van de dag meldt
  // "stuur je DM's", anders wordt het ruis.
  let outreachReminder = false;
  if (new Date().getUTCHours() < 12) {
    const { data: agencies } = await admin.from("agencies").select("id");
    for (const a of agencies ?? []) {
      const { count } = await admin
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", a.id)
        .eq("stage", "te_contacteren");
      if ((count ?? 0) > 0) {
        await admin.from("notifications").insert({
          agency_id: a.id,
          audience: "team",
          type: "todo",
          title: "Outreach: stuur je DM's van vandaag",
          body: `${count} prospects staan klaar onder "Te contacteren" — berichten liggen kant-en-klaar.`,
          link: "/platform/outreach",
        });
        outreachReminder = true;
      }
    }
  }

  // ── Moneybird: melding bij nieuwe facturen ──────────────────────
  let newInvoices = 0;
  if (moneybirdConfigured()) {
    const mb = await getMoneybirdMonth();
    if (!mb.error && mb.invoices.length) {
      const ids = mb.invoices.map((i) => i.id);
      const { data: seen } = await admin.from("seen_invoices").select("id").in("id", ids);
      const seenSet = new Set((seen ?? []).map((s) => String(s.id)));
      const fresh = mb.invoices.filter((i) => !seenSet.has(i.id));
      if (fresh.length) {
        const { data: agencies } = await admin.from("agencies").select("id").limit(1);
        const agencyId = agencies?.[0]?.id;
        for (const inv of fresh) {
          const { error: seenErr } = await admin.from("seen_invoices").insert({ id: inv.id });
          // Tabel bestaat nog niet (migratie 021 niet gedraaid)? Dan stil overslaan.
          if (seenErr) break;
          if (agencyId) {
            await admin.from("notifications").insert({
              agency_id: agencyId,
              audience: "team",
              type: "info",
              title: `Nieuwe factuur: ${inv.contact}`,
              body: `${fmtEur(inv.totalExcl)} excl. btw · status: ${inv.state === "paid" ? "betaald" : inv.state}`,
              link: "/platform/finance",
            });
            newInvoices++;
          }
        }
      }
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    synced: results.length,
    competitors: competitorsSynced,
    outreachReminder,
    newInvoices,
    results,
  });
}
