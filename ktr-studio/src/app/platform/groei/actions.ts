"use server";

import { revalidatePath } from "next/cache";
import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { buildGrowthPlan } from "@/lib/growth";
import { generateText } from "@/lib/ai";

const ANALYSIS_TEMPLATE = `Je bent de strategisch adviseur van Menno Kater (content-agency, doel is het maandbedrag in de cijfers). Hieronder de actuele cijfers als JSON. Schrijf een korte analyse in het Nederlands: wat valt op, wat is dé hefboom voor komende week, en één concreet dagelijks gedrag dat het verschil maakt. Maximaal 130 woorden, geen opsomming van de cijfers zelf, geen inleiding, direct de inhoud. Nuchter en direct, geen em-dashes.

{{onderwerp}}`;

export async function refreshAnalysisAction(): Promise<{ ok?: boolean; error?: string; note?: string }> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (profile?.role !== "owner" && profile?.role !== "team") return { error: "Alleen het team kan de analyse verversen." };

  const plan = await buildGrowthPlan();
  if (!plan) return { error: "Geen data om te analyseren." };

  const { text, mock } = await generateText({
    template: ANALYSIS_TEMPLATE,
    input: JSON.stringify({
      doel: plan.goal,
      mrr: plan.mrr,
      gat: plan.gap,
      gefactureerd_deze_maand: plan.invoicedThisMonth,
      betaald: plan.paidThisMonth,
      gemiddelde_retainer: plan.avgRetainer,
      acties: plan.actions.map((a) => `${a.title} (${a.why})`),
    }),
    model: "smart",
  });
  if (mock) return { error: "AI-key ontbreekt in deze omgeving." };

  const note = text.trim();
  const { error } = await supabase.from("growth_notes").insert({ agency_id: agency.id, note });
  if (error) return { error: error.message };

  revalidatePath("/platform/groei");
  return { ok: true, note };
}
