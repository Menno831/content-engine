import { NextRequest, NextResponse } from "next/server";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const template = String(body.template ?? "").trim();
  const input = String(body.input ?? "").trim();
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

  try {
    const { text, mock } = await generateText({ template, input });
    return NextResponse.json({ ok: true, text, mock });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekende fout";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
