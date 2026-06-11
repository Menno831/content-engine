import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { submitSoulImage, pollSoulJobSet, higgsfieldConfigured, type SoulSizeKey } from "@/lib/higgsfield";

// ════════════════════════════════════════════════════════════════
// AI Visuals / thumbnails via Higgsfield Soul. Twee acties:
//  { action: "generate", client_id, prompt, size, use_brand } -> job_set_id
//  { action: "poll", job_set_id, client_id, prompt }          -> urls; bij
//      klaar worden de afbeeldingen opgeslagen in `generations`.
// ════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!higgsfieldConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HIGGSFIELD_API_KEY ontbreekt — voeg 'm toe in Vercel (formaat KEY_ID:KEY_SECRET)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) return NextResponse.json({ ok: false, error: "Inloggen vereist." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const clientId = String(body.client_id ?? "");

  try {
    if (action === "generate") {
      const prompt = String(body.prompt ?? "").trim();
      if (!prompt) return NextResponse.json({ ok: false, error: "Prompt is verplicht." }, { status: 400 });
      const size = (["square", "portrait"].includes(String(body.size)) ? body.size : "square") as SoulSizeKey;

      // Klantprofiel: vast Soul-character + brand-prompt + kleuren (RLS bewaakt toegang).
      let characterId: string | null = null;
      let finalPrompt = prompt;
      if (clientId) {
        const { data: c } = await supabase
          .from("clients")
          .select("soul_character_id, brand_prompt, brand_primary, brand_secondary")
          .eq("id", clientId)
          .maybeSingle();
        characterId = (c?.soul_character_id as string | null) ?? null;
        if (body.use_brand !== false) {
          const parts = [
            c?.brand_prompt ? String(c.brand_prompt) : null,
            c?.brand_primary ? `Brand colors: primary ${c.brand_primary}${c?.brand_secondary ? `, secondary ${c.brand_secondary}` : ""}.` : null,
          ].filter(Boolean);
          if (parts.length) finalPrompt = `${prompt}\n\n${parts.join(" ")}`;
        }
      }

      const jobSetId = await submitSoulImage({ prompt: finalPrompt, size, characterId, batch: "QUAD" });
      return NextResponse.json({ ok: true, job_set_id: jobSetId, used_character: Boolean(characterId) });
    }

    if (action === "poll") {
      const jobSetId = String(body.job_set_id ?? "");
      if (!jobSetId) return NextResponse.json({ ok: false, error: "job_set_id ontbreekt" }, { status: 400 });

      const status = await pollSoulJobSet(jobSetId);
      if (status.failed) return NextResponse.json({ ok: false, error: status.detail ?? "Generatie mislukt." }, { status: 502 });
      if (!status.done) return NextResponse.json({ ok: true, done: false });

      // Klaar -> opslaan in de generatie-historie (RLS: insert binnen agency).
      const { agency } = await getSessionContext();
      if (agency) {
        for (const url of status.urls) {
          await supabase.from("generations").insert({
            agency_id: agency.id,
            client_id: clientId || null,
            kind: "image",
            prompt: String(body.prompt ?? "").slice(0, 500),
            output_url: url,
            status: "done",
          });
        }
      }
      return NextResponse.json({ ok: true, done: true, urls: status.urls });
    }

    return NextResponse.json({ ok: false, error: "onbekende actie" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekende fout";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
