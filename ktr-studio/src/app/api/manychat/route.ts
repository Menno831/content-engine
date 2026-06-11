import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ════════════════════════════════════════════════════════════════
// ManyChat-webhook: leads stromen automatisch de CRM in.
//
// Instellen in ManyChat: External Request (POST) naar
//   https://<jouw-domein>/api/manychat
// met JSON-body:
//   {
//     "secret":        "<MANYCHAT_WEBHOOK_SECRET>",
//     "client_id":     "<uuid van de klant in KTR Studio>",
//     "name":          "{{first_name}} {{last_name}}",
//     "subscriber_id": "{{user_id}}",
//     "source":        "ManyChat: 'GIDS'",   // welk keyword/flow
//     "setter":        "Menno"               // optioneel
//   }
// Dubbele subscribers worden niet opnieuw aangemaakt (dedupe op
// subscriber_id per klant).
// ════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "MANYCHAT_WEBHOOK_SECRET niet geconfigureerd." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const given = String(body.secret ?? request.headers.get("x-webhook-secret") ?? "");
  if (given !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const clientId = String(body.client_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const subscriberId = String(body.subscriber_id ?? "").trim();
  if (!clientId || !name) {
    return NextResponse.json({ ok: false, error: "client_id en name zijn verplicht" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "serverkey ontbreekt" }, { status: 503 });

  // Klant moet bestaan (voorkomt rommel-inserts met willekeurige uuid's).
  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (!client) return NextResponse.json({ ok: false, error: "onbekende client_id" }, { status: 400 });

  // Dedupe: zelfde subscriber bij dezelfde klant niet dubbel aanmaken.
  if (subscriberId) {
    const { data: existing } = await admin
      .from("leads")
      .select("id")
      .eq("client_id", clientId)
      .eq("external_id", subscriberId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, deduped: true });
  }

  const { error } = await admin.from("leads").insert({
    client_id: clientId,
    name: name.slice(0, 120),
    external_id: subscriberId || null,
    source_label: String(body.source ?? "ManyChat").slice(0, 120),
    setter: String(body.setter ?? "").trim().slice(0, 60) || null,
    stage: "nieuw",
    value: Number(body.value ?? 0) || 0,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
