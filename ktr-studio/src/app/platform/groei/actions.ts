"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/guard";
import { buildGrowthPlanWith, type GrowthPlan } from "@/lib/growth";
import { writeGrowthAnalysis } from "@/lib/watchdog";

// De "Ververs analyse"-knop op Groei gebruikt exact dezelfde prompt en
// schrijver als de maandag-cron (lib/watchdog), zodat beide analyses
// nooit uit elkaar groeien.
export async function refreshAnalysisAction(): Promise<{ ok?: boolean; error?: string; note?: string }> {
  const ctx = await requireTeam();
  if ("error" in ctx) return { error: ctx.error };

  const plan: GrowthPlan | null = await buildGrowthPlanWith(ctx.supabase);
  if (!plan) return { error: "Geen data om te analyseren." };

  const r = await writeGrowthAnalysis(ctx.supabase, ctx.agency.id, plan);
  if (r.error) return { error: r.error.includes("ANTHROPIC") ? "AI-key ontbreekt in deze omgeving." : r.error };

  revalidatePath("/platform/groei");
  return { ok: true, note: r.note };
}
