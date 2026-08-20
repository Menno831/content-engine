"use server";

// Inzending van een publiek leadformulier. De bezoeker is niet
// ingelogd, dus dit loopt via de service-role — met een strikte check
// op een bestaand, actief formulier-token.

import { createAdminClient } from "@/lib/supabase/admin";

export interface SubmitResult {
  ok?: boolean;
  error?: string;
}

export async function submitLeadFormAction(
  token: string,
  input: { name: string; email: string; phone: string; instagram: string; note: string }
): Promise<SubmitResult> {
  const admin = createAdminClient();
  if (!admin) return { error: "Formulier is even niet bereikbaar. Probeer het later opnieuw." };
  if (!input.name.trim()) return { error: "Vul je naam in." };
  if (!input.email.trim() && !input.phone.trim() && !input.instagram.trim()) {
    return { error: "Laat een e-mail, telefoonnummer of Instagram achter zodat we je kunnen bereiken." };
  }

  const { data: form } = await admin
    .from("lead_forms")
    .select("id,agency_id,client_id,active,submissions,name")
    .eq("token", token)
    .maybeSingle();
  if (!form || !form.active) return { error: "Dit formulier is niet meer actief." };

  // Zonder klant kan er geen lead worden weggeschreven (leads hangen aan
  // een klant) — dan melden we dat eerlijk in plaats van stil te falen.
  if (!form.client_id) return { error: "Dit formulier is nog niet aan een klant gekoppeld." };

  const { error } = await admin.from("leads").insert({
    client_id: form.client_id,
    name: input.name.trim(),
    source: "Formulier",
    source_label: `Formulier: ${form.name}`,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    instagram: input.instagram.trim() || null,
    notes: input.note.trim() || null,
    stage: "nieuw",
  });
  if (error) return { error: "Versturen lukte niet. Probeer het zo nog eens." };

  await admin
    .from("lead_forms")
    .update({ submissions: Number(form.submissions ?? 0) + 1 })
    .eq("id", form.id);

  return { ok: true };
}
