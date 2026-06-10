import { NextRequest, NextResponse } from "next/server";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { getClient as getClientProfile } from "@/lib/data";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const template = String(body.template ?? "").trim();
  const input = String(body.input ?? "").trim();
  const clientId = String(body.client_id ?? "").trim();
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

  try {
    const { text, mock } = await generateText({ template: finalTemplate, input });
    return NextResponse.json({ ok: true, text, mock });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekende fout";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
