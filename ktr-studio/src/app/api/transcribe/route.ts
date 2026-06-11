import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import {
  getUploadUrl,
  startTranscription,
  getTranscription,
  transkriptorConfigured,
} from "@/lib/transkriptor";

// ════════════════════════════════════════════════════════════════
// Audio/video -> transcript via Transkriptor. Eén route, drie acties:
//  { action: "start", file_name }            -> upload-URL voor de browser
//  { action: "begin", public_url }           -> transcriptie starten -> order_id
//  { action: "poll", order_id, client_id, title } -> status; bij klaar:
//      transcript opslaan bij de klant en tekst teruggeven.
// ════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!transkriptorConfigured()) {
    return NextResponse.json(
      { ok: false, error: "TRANSKRIPTOR_API_KEY ontbreekt — voeg 'm toe in Vercel om audio/video direct te transcriberen." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ ok: false, error: "Inloggen vereist." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "start") {
      const fileName = String(body.file_name ?? "opname").slice(0, 120);
      const { uploadUrl, publicUrl } = await getUploadUrl(fileName);
      return NextResponse.json({ ok: true, upload_url: uploadUrl, public_url: publicUrl });
    }

    if (action === "begin") {
      const publicUrl = String(body.public_url ?? "");
      if (!publicUrl) return NextResponse.json({ ok: false, error: "public_url ontbreekt" }, { status: 400 });
      const orderId = await startTranscription(publicUrl, String(body.language ?? "nl-NL"));
      return NextResponse.json({ ok: true, order_id: orderId });
    }

    if (action === "poll") {
      const orderId = String(body.order_id ?? "");
      const clientId = String(body.client_id ?? "");
      const title = String(body.title ?? "Transcript").slice(0, 120);
      if (!orderId) return NextResponse.json({ ok: false, error: "order_id ontbreekt" }, { status: 400 });

      const status = await getTranscription(orderId);
      if (status.failed) return NextResponse.json({ ok: false, error: "Transcriberen mislukt bij Transkriptor." }, { status: 502 });
      if (!status.done || !status.text) return NextResponse.json({ ok: true, done: false });

      // Klaar -> transcript opslaan bij de klant (RLS bewaakt eigenaarschap).
      if (clientId && supabase) {
        const { agency } = await getSessionContext();
        if (agency) {
          await supabase.from("transcripts").insert({
            agency_id: agency.id,
            client_id: clientId,
            title,
            content: status.text.slice(0, 500_000),
          });
        }
      }
      return NextResponse.json({ ok: true, done: true, chars: status.text.length });
    }

    return NextResponse.json({ ok: false, error: "onbekende actie" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekende fout";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
