"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";

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
