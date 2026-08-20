import { redirectEditorToBoard } from "@/lib/guard";
import { PageHeader } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { AdBoard, type SpendRow, type MonthResult } from "./AdBoard";

// Advertising: uitgaven afgezet tegen de leads en omzet uit dezelfde maand.
export default async function AdvertisingPage() {
  await redirectEditorToBoard();
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const { clients, leads } = await getWorkspaceData();

  let rows: SpendRow[] = [];
  let migrationMissing = false;
  if (!demo) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("ad_spend")
        .select("id,month,platform,amount,client_id,notes")
        .order("month", { ascending: false });
      if (error) migrationMissing = true;
      else {
        const nameById = new Map(clients.map((c) => [c.id, c.name]));
        rows = (data ?? []).map((r) => ({
          id: r.id as string,
          month: String(r.month).slice(0, 7),
          platform: (r.platform as string) ?? "Anders",
          amount: Number(r.amount ?? 0),
          clientId: (r.client_id as string) ?? null,
          clientName: r.client_id ? (nameById.get(r.client_id as string) ?? null) : null,
          notes: (r.notes as string) ?? null,
        }));
      }
    }
  }

  // Leads en gesloten omzet per maand, om naast de uitgaven te zetten.
  const perMonth = new Map<string, MonthResult>();
  for (const l of leads) {
    const month = (l.createdISO ?? "").slice(0, 7);
    if (!month) continue;
    const cur = perMonth.get(month) ?? { month, leads: 0, won: 0, revenue: 0 };
    cur.leads += 1;
    if (l.stage === "closed") {
      cur.won += 1;
      cur.revenue += l.value;
    }
    perMonth.set(month, cur);
  }

  return (
    <>
      <PageHeader
        eyebrow="Groei"
        title="Advertenties"
        subtitle="Wat je uitgeeft aan boosts en ads, en of het leads en omzet oplevert."
      />
      {demo ? (
        <p className="text-sm text-muted">Demo-modus — advertenties werken in de echte omgeving.</p>
      ) : migrationMissing ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-300">
          Draai migratie 026 in Supabase (tabel <code>ad_spend</code>) — daarna werkt deze pagina direct.
        </div>
      ) : (
        <AdBoard
          initial={rows}
          results={[...perMonth.values()]}
          clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        />
      )}
    </>
  );
}
