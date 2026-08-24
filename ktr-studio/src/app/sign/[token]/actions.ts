"use server";

// Digitaal ondertekenen: de tegenpartij vult naam in en gaat akkoord.
// Vastgelegd met tijdstempel; het contract springt op "getekend".
// Eén keer tekenen — daarna is de pagina alleen-lezen.

import { createAdminClient } from "@/lib/supabase/admin";

export interface SignResult {
  ok?: boolean;
  error?: string;
}

export async function signDocumentAction(token: string, name: string): Promise<SignResult> {
  const admin = createAdminClient();
  if (!admin) return { error: "Ondertekenen is even niet mogelijk. Probeer het later opnieuw." };

  const signedName = name.trim().slice(0, 120);
  if (signedName.length < 2) return { error: "Vul je volledige naam in." };

  const { data: doc } = await admin
    .from("contracts")
    .select("id, signed_at")
    .eq("sign_token", token)
    .maybeSingle();
  if (!doc) return { error: "Dit document bestaat niet (meer)." };
  if (doc.signed_at) return { error: "Dit document is al ondertekend." };

  const { error } = await admin
    .from("contracts")
    .update({ signed_name: signedName, signed_at: new Date().toISOString(), status: "getekend" })
    .eq("id", doc.id)
    .is("signed_at", null);
  if (error) return { error: "Ondertekenen lukte niet. Probeer het zo nog eens." };

  return { ok: true };
}
