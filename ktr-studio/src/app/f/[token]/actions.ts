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
  input: { name: string; email: string; phone: string; instagram: string; note: string; website?: string }
): Promise<SubmitResult> {
  const admin = createAdminClient();
  if (!admin) return { error: "Formulier is even niet bereikbaar. Probeer het later opnieuw." };

  // Honeypot: het verborgen "website"-veld vullen alleen bots in.
  // We doen alsof het gelukt is, zodat de bot niets leert.
  if (input.website?.trim()) return { ok: true };

  const name = input.name.trim().slice(0, 120);
  if (!name) return { error: "Vul je naam in." };
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
    name,
    source: "Formulier",
    source_label: `Formulier: ${form.name}`,
    email: input.email.trim().slice(0, 200) || null,
    phone: input.phone.trim().slice(0, 40) || null,
    instagram: input.instagram.trim().slice(0, 80) || null,
    notes: input.note.trim().slice(0, 2000) || null,
    stage: "nieuw",
  });
  if (error) return { error: "Versturen lukte niet. Probeer het zo nog eens." };

  // Atomaire increment in de database (migratie 031) — race-vrij en
  // onafhankelijk van labels of latere lead-bewerkingen. Valt terug op
  // een gewone update zolang de migratie nog niet gedraaid is.
  const { error: rpcError } = await admin.rpc("increment_form_submissions", { p_form_id: form.id });
  if (rpcError) {
    await admin
      .from("lead_forms")
      .update({ submissions: Number(form.submissions ?? 0) + 1 })
      .eq("id", form.id);
  }

  return { ok: true };
}
