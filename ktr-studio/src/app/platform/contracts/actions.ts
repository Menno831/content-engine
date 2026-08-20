"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";

export interface ContractResult {
  ok?: boolean;
  error?: string;
}

export async function createContractAction(input: {
  title: string;
  clientId: string | null;
  party: string;
  value: number;
  recurring: boolean;
  status: string;
  startsOn: string;
  endsOn: string;
  docUrl: string;
  notes: string;
}): Promise<ContractResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (!input.title.trim()) return { error: "Titel is verplicht." };

  const { error } = await supabase.from("contracts").insert({
    agency_id: agency.id,
    client_id: input.clientId,
    title: input.title.trim(),
    party: input.party.trim() || null,
    value: Number(input.value) || 0,
    recurring: input.recurring,
    status: input.status,
    starts_on: input.startsOn || null,
    ends_on: input.endsOn || null,
    doc_url: input.docUrl.trim() || null,
    notes: input.notes.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/contracts");
  return { ok: true };
}

export async function updateContractStatusAction(id: string, status: string): Promise<ContractResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("contracts").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/contracts");
  return { ok: true };
}

export async function deleteContractAction(id: string): Promise<ContractResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/platform/contracts");
  return { ok: true };
}
