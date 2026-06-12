"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/auth";
import { generateBriefForClient } from "@/lib/brief";

export interface BriefResult {
  error?: string;
  ok?: string;
}

// Handmatig de brief van vandaag (her)genereren voor alle actieve klanten.
export async function generateBriefNowAction(): Promise<BriefResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency } = await getSessionContext();
  if (!agency) return { error: "Geen agency gevonden — log opnieuw in." };

  const admin = createAdminClient();
  if (!admin) return { error: "Serverkey ontbreekt." };

  const { data: clients } = await supabase.from("clients").select("id").neq("status", "gepauzeerd");
  if (!clients?.length) return { error: "Nog geen actieve klanten." };

  let total = 0;
  let noKey = false;
  for (const c of clients) {
    const r = await generateBriefForClient(admin, agency.id, c.id, { force: true });
    if (r.error === "geen_key") noKey = true;
    total += r.created;
  }

  if (noKey) return { error: "ANTHROPIC_API_KEY ontbreekt — koppel 'm in Vercel om briefs te genereren." };
  revalidatePath("/platform/brief");
  return { ok: total > 0 ? `${total} nieuwe ideeën gegenereerd.` : "Geen nieuwe ideeën — probeer het later opnieuw." };
}

// Eén idee verbergen (status -> verborgen).
export async function hideBriefIdeaAction(ideaId: string): Promise<BriefResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth vereist" };

  const { error } = await supabase.from("brief_ideas").update({ status: "verborgen" }).eq("id", ideaId);
  if (error) return { error: error.message };
  revalidatePath("/platform/brief");
  return { ok: "Verborgen." };
}
