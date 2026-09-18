"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { requireTeam } from "@/lib/guard";

const STATUSES = ["betaald", "open", "te_laat"] as const;

export async function updatePaymentStatusAction(clientId: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Ongeldige status." };

  const { error } = await supabase.from("clients").update({ payment_status: status }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
  return { ok: true };
}


// ── Kosten per Moneybird-factuur (voor winst per factuur) ───────
export interface CostLine {
  label: string;
  amount: number;
}

export async function setInvoiceCostAction(
  invoiceId: string,
  cost: number,
  breakdown?: CostLine[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency — log opnieuw in." };

  const lines = (breakdown ?? [])
    .map((l) => ({ label: String(l.label ?? "").slice(0, 60), amount: Number(l.amount) || 0 }))
    .filter((l) => l.label || l.amount);

  const { error } = await supabase.from("invoice_costs").upsert({
    id: invoiceId,
    agency_id: agency.id,
    cost: lines.length ? lines.reduce((s, l) => s + l.amount, 0) : Number(cost) || 0,
    breakdown: lines.length ? lines : null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Overige inkomsten per maand (nooit gefactureerd, bv. crypto) ─
export async function addOtherIncomeAction(
  month: string, // "YYYY-MM"
  label: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency — log opnieuw in." };
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Ongeldige maand." };
  if (!label.trim()) return { ok: false, error: "Omschrijving is verplicht." };

  const { error } = await supabase.from("other_income").insert({
    agency_id: agency.id,
    month: `${month}-01`,
    label: label.trim(),
    amount: Number(amount) || 0,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
  return { ok: true };
}

export async function deleteOtherIncomeAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("other_income").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Retainer/pakket per klant bijwerken (vanaf Finance) ─────────
export async function updateClientFinanceAction(
  clientId: string,
  patch: { monthly_value?: number; package?: string; videos_per_month?: number; editor_cost?: number; video_price?: number | null; invoice_day?: number; currency?: string; is_own_brand?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };

  const update: Record<string, unknown> = {};
  if (patch.monthly_value !== undefined) update.monthly_value = Number(patch.monthly_value) || 0;
  if (patch.package !== undefined) update.package = patch.package.trim() || null;
  if (patch.videos_per_month !== undefined) update.videos_per_month = Number(patch.videos_per_month) || 0;
  if (patch.editor_cost !== undefined) update.editor_cost = Number(patch.editor_cost) || 0;
  if (patch.video_price !== undefined) update.video_price = patch.video_price === null ? null : Number(patch.video_price) || 0;
  if (patch.invoice_day !== undefined) update.invoice_day = Math.min(28, Math.max(1, Number(patch.invoice_day) || 1));
  if (patch.currency !== undefined) update.currency = patch.currency === "USD" ? "USD" : "EUR";
  if (patch.is_own_brand !== undefined) update.is_own_brand = Boolean(patch.is_own_brand);

  const { error } = await supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
  revalidatePath("/platform/clients");
  revalidatePath("/platform");
  return { ok: true };
}

// ── Vaste maandlasten (Claude, bank, Skool, telefoon...) ────────
export async function addFixedCostAction(
  name: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency — log opnieuw in." };
  if (!name.trim()) return { ok: false, error: "Naam is verplicht." };

  const { error } = await supabase.from("fixed_costs").insert({
    agency_id: agency.id,
    name: name.trim(),
    amount: Number(amount) || 0,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
  return { ok: true };
}

export async function deleteFixedCostAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };

  const { error } = await supabase.from("fixed_costs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Maanddoelen: klikbaar doel per komende maand ────────────────
export async function setMonthGoalAction(month: string, goal: number, note: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Ongeldige maand." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency." };
  const { error } = await supabase
    .from("month_goals")
    .upsert({ agency_id: agency.id, month, goal, note: note || null }, { onConflict: "agency_id,month" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Potjes-percentages (door Menno zelf ingesteld) ──────────────
export async function saveReserveConfigAction(config: { belasting: number; buffer: number; beleggen: number }): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency." };
  const clean = {
    belasting: Math.max(0, Math.min(100, Number(config.belasting) || 0)),
    buffer: Math.max(0, Math.min(100, Number(config.buffer) || 0)),
    beleggen: Math.max(0, Math.min(100, Number(config.beleggen) || 0)),
  };
  const { error } = await supabase.from("agencies").update({ reserve_config: clean }).eq("id", agency.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Uitgaven-triage: bankmutatie koppelen aan klant / vaste last ─
export async function linkExpenseAction(input: {
  mutationId: string;
  kind: string; // klant | vast | prive | overig
  clientId?: string | null;
  label?: string;
  amount: number;
  date?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency." };
  if (!["klant", "vast", "prive", "overig"].includes(input.kind)) return { ok: false, error: "Ongeldige categorie." };
  const { error } = await supabase.from("expense_links").upsert({
    id: input.mutationId,
    agency_id: agency.id,
    client_id: input.kind === "klant" ? (input.clientId ?? null) : null,
    kind: input.kind,
    label: input.label ?? null,
    amount: input.amount,
    mutation_date: input.date ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}


// Terugkerende afschrijving → vaste last, en de mutaties meteen gelabeld
// zodat ze niet ook nog in de triage of dubbel in de kosten belanden.
export async function adoptFixedCostAction(input: {
  name: string;
  amount: number;
  mutationIds: string[];
  dates: (string | null)[];
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency." };

  const { error } = await supabase.from("fixed_costs").insert({ agency_id: agency.id, name: input.name.trim().slice(0, 80), amount: Math.abs(Number(input.amount) || 0), note: "uit bankmutaties" });
  if (error) return { ok: false, error: error.message };

  if (input.mutationIds.length) {
    const rows = input.mutationIds.map((id, i) => ({
      id, agency_id: agency.id, kind: "vast", label: input.name.trim().slice(0, 80),
      amount: -Math.abs(Number(input.amount) || 0), mutation_date: input.dates[i] ?? null, client_id: null,
    }));
    await supabase.from("expense_links").upsert(rows);
  }
  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Taken op Finance wegklikken ─────────────────────────────────
// Weg tot het einde van de maand: volgende maand is het weer relevant
// (een factuur die eruit moet, kosten die ontbreken). Terughalen kan
// met dezelfde knop.
export async function dismissFinanceTodoAction(key: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireTeam();
  if ("error" in auth) return { ok: false, error: auth.error };
  const now = new Date();
  const until = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { error } = await auth.supabase
    .from("finance_dismissals")
    .upsert({ agency_id: auth.agency.id, item_key: key.slice(0, 120), until }, { onConflict: "agency_id,item_key" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}

// ── Deals in de pijplijn ────────────────────────────────────────
export interface DealInput {
  id?: string;
  name: string;
  monthlyValue: number;
  currency: string;
  stage: string;
  startsMonth: string | null; // YYYY-MM
  note: string | null;
}

export async function saveDealAction(input: DealInput): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireTeam();
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!input.name.trim()) return { ok: false, error: "Geef de deal een naam." };

  const row = {
    agency_id: auth.agency.id,
    name: input.name.trim().slice(0, 120),
    monthly_value: Math.max(0, Number(input.monthlyValue) || 0),
    currency: input.currency === "USD" ? "USD" : "EUR",
    stage: ["gesprek", "voorstel", "mondeling_ja", "gewonnen", "verloren"].includes(input.stage) ? input.stage : "gesprek",
    starts_month: input.startsMonth && /^\d{4}-\d{2}$/.test(input.startsMonth) ? `${input.startsMonth}-01` : null,
    note: input.note?.trim() || null,
  };

  const { error } = input.id
    ? await auth.supabase.from("deals").update(row).eq("id", input.id)
    : await auth.supabase.from("deals").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}

export async function deleteDealAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireTeam();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { error } = await auth.supabase.from("deals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform/finance");
  return { ok: true };
}

// Gewonnen? Dan hoort het bij de klanten, niet meer in de pijplijn.
export async function dealToClientAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireTeam();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { data: deal } = await auth.supabase.from("deals").select("name,monthly_value,currency").eq("id", id).maybeSingle();
  if (!deal) return { ok: false, error: "Deal niet gevonden." };

  const { error } = await auth.supabase.from("clients").insert({
    agency_id: auth.agency.id,
    name: String(deal.name).slice(0, 120),
    monthly_value: Number(deal.monthly_value ?? 0),
    currency: (deal.currency as string) === "USD" ? "USD" : "EUR",
    status: "onboarding",
  });
  if (error) return { ok: false, error: error.message };
  await auth.supabase.from("deals").update({ stage: "gewonnen" }).eq("id", id);
  revalidatePath("/platform/finance");
  revalidatePath("/platform/clients");
  return { ok: true };
}
