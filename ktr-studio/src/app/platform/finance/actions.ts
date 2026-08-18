"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

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
export async function setInvoiceCostAction(
  invoiceId: string,
  cost: number,
  note?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { ok: false, error: "Geen agency — log opnieuw in." };

  const { error } = await supabase.from("invoice_costs").upsert({
    id: invoiceId,
    agency_id: agency.id,
    cost: Number(cost) || 0,
    note: note?.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/finance");
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
