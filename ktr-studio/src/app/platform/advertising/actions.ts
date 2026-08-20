"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface AdResult {
  ok?: boolean;
  error?: string;
}

export async function addAdSpendAction(input: {
  month: string; // "YYYY-MM"
  platform: string;
  amount: number;
  clientId: string | null;
  notes: string;
}): Promise<AdResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (!/^\d{4}-\d{2}$/.test(input.month)) return { error: "Kies een maand." };

  const { error } = await supabase.from("ad_spend").insert({
    agency_id: agency.id,
    client_id: input.clientId,
    month: `${input.month}-01`,
    platform: input.platform,
    amount: Number(input.amount) || 0,
    notes: input.notes.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/advertising");
  return { ok: true };
}

export async function deleteAdSpendAction(id: string): Promise<AdResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("ad_spend").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/advertising");
  return { ok: true };
}
