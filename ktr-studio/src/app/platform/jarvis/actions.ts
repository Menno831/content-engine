"use server";

// Jarvis: de gespreks-acties. De briefing werkt altijd (regelgebaseerd
// met AI-laag); het vrije gesprek heeft de Anthropic-key nodig en
// zegt dat eerlijk als die ontbreekt.

import { createClient as supabaseServer } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { getOrCreateBriefing } from "@/lib/briefing";
import { buildGrowthPlanWith } from "@/lib/growth";
import { generateText } from "@/lib/ai";

export interface JarvisReply {
  ok?: boolean;
  error?: string;
  reply?: string;
}

const CHAT_TEMPLATE = `Je bent Jarvis, de persoonlijke assistent van Menno Kater. Hij runt een content-agency (Reels en YouTube voor founders) met een maanddoel dat als 'doel' in de cijfers staat. Je krijgt hieronder de actuele bedrijfscontext en het recente gesprek. Antwoord in het Nederlands: kort, direct, nuchter en concreet. Denk mee als strateeg, niet als cheerleader. Verwijs naar echte cijfers uit de context als dat relevant is en verzin nooit cijfers. Geen em-dashes. Maximaal 120 woorden tenzij hij expliciet om meer vraagt.

{{onderwerp}}`;

export async function askJarvisAction(question: string): Promise<JarvisReply> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency, user, profile } = await getSessionContext();
  if (!agency || !user) return { error: "Geen agency — log opnieuw in." };
  if (profile?.role !== "owner" && profile?.role !== "team") return { error: "Jarvis is er alleen voor het team." };

  const q = question.trim().slice(0, 2000);
  if (!q) return { error: "Zeg of typ eerst iets." };

  // Context: het groeiplan + het recente gesprek.
  const [plan, { data: history }] = await Promise.all([
    buildGrowthPlanWith(supabase),
    supabase
      .from("assistant_messages")
      .select("role, content")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const context = [
    "BEDRIJFSCONTEXT (actueel):",
    plan
      ? JSON.stringify({
          doel: plan.goal,
          mrr: plan.mrr,
          gat: plan.gap,
          gefactureerd_deze_maand: plan.invoicedThisMonth,
          betaald: plan.paidThisMonth,
          gemiddelde_retainer: plan.avgRetainer,
          acties: plan.actions.map((a) => `${a.title} — ${a.why}`),
        })
      : "(geen data)",
    "",
    "RECENT GESPREK (oud naar nieuw):",
    ...(history ?? []).reverse().map((m) => `${m.role === "user" ? "Menno" : "Jarvis"}: ${m.content}`),
    "",
    `Menno vraagt nu: ${q}`,
  ].join("\n");

  let text = "";
  let mock = false;
  try {
    ({ text, mock } = await generateText({ template: CHAT_TEMPLATE, input: context, model: "smart" }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "onbekende fout";
    return { error: `Mijn brein hapert even: ${msg.slice(0, 200)}. Probeer het zo opnieuw.` };
  }
  if (mock) {
    return {
      error:
        "Mijn brein staat nog uit: de ANTHROPIC_API_KEY in Vercel is leeg of kapot. Zet 'm opnieuw, dan praat ik direct mee. De briefing werkt wel gewoon.",
    };
  }

  const reply = text.trim();

  // Geschiedenis bewaren (fouten hier mogen het antwoord niet blokkeren).
  await supabase.from("assistant_messages").insert([
    { agency_id: agency.id, user_id: user.id, role: "user", content: q },
    { agency_id: agency.id, user_id: user.id, role: "assistant", content: reply },
  ]);

  return { ok: true, reply };
}

export async function getBriefingAction(): Promise<JarvisReply> {
  const supabase = await supabaseServer();
  if (!supabase) return { error: "Supabase niet geconfigureerd." };
  const { agency, profile } = await getSessionContext();
  if (!agency) return { error: "Geen agency — log opnieuw in." };
  if (profile?.role !== "owner" && profile?.role !== "team") return { error: "Jarvis is er alleen voor het team." };

  const b = await getOrCreateBriefing(supabase, agency.id);
  if (!b) return { error: "Geen briefing beschikbaar." };
  return { ok: true, reply: b.content };
}
