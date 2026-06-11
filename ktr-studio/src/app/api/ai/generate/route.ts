import { NextRequest, NextResponse } from "next/server";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { getClient as getClientProfile } from "@/lib/data";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const template = String(body.template ?? "").trim();
  const input = String(body.input ?? "").trim();
  const clientId = String(body.client_id ?? "").trim();
  // Snelle/goedkope generaties (hooks, scripts) draaien op Haiku;
  // standaard (brand-context, prompts) op Opus.
  const model = body.fast ? "fast" : "smart";
  if (!template) {
    return NextResponse.json({ ok: false, error: "template is verplicht" }, { status: 400 });
  }

  // Als er een echte key is, mag alleen een ingelogde gebruiker genereren
  // (anders zou iedereen de betaalde key kunnen leegtrekken). Zonder key
  // (showroom/demo) is het mock en vrij toegankelijk.
  if (isClaudeConfigured()) {
    const supabase = await createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!user) {
      return NextResponse.json({ ok: false, error: "Inloggen vereist." }, { status: 401 });
    }
  }

  // Second brain meesturen: relevante kennisbank-items (boards) als
  // context, gescoord op simpele keyword-overlap met de input.
  let brainBlock = "";
  if (body.use_brain) {
    const supabase = await createClient();
    if (supabase) {
      const { data: items } = await supabase
        .from("captures")
        .select("title, body, url, kind")
        .order("created_at", { ascending: false })
        .limit(120);
      if (items?.length) {
        const q = `${input} ${template}`.toLowerCase();
        const qWords = [...new Set(q.split(/\W+/).filter((w) => w.length > 3))];
        const scored = items
          .map((it) => {
            const hay = `${it.title} ${it.body ?? ""}`.toLowerCase();
            const score = qWords.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0) + (it.body ? 0.5 : 0);
            return { ...it, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        const lines = scored
          .map((it) => `- [${it.kind}] ${it.title}${it.body ? `: ${String(it.body).slice(0, 1500)}` : ""}${it.url ? ` (${it.url})` : ""}`)
          .join("\n");
        brainBlock = `KENNISBANK (second brain van de agency — gebruik relevante inzichten, verhalen en bronnen hieruit waar het de output sterker maakt):\n${lines}\n\n`;
      }
    }
  }

  // Brand voice van de gekozen klant meesturen, zodat de output in de
  // stem van die klant geschreven wordt (vastgelegd bij onboarding).
  let finalTemplate = template;
  if (clientId) {
    const profile = await getClientProfile(clientId).catch(() => null);
    const voiceParts = [
      profile?.brandVoice ? `Brand voice van de klant (volg deze strikt): ${profile.brandVoice}` : null,
      profile?.brandIdentity ? `Brand identity: ${profile.brandIdentity}` : null,
    ].filter(Boolean);
    if (voiceParts.length) {
      finalTemplate = `${voiceParts.join("\n")}\n\n${template}`;
    }
  }
  if (brainBlock) finalTemplate = `${brainBlock}${finalTemplate}`;

  try {
    const { text, mock } = await generateText({ template: finalTemplate, input, model });
    return NextResponse.json({ ok: true, text, mock });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekende fout";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
