import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ════════════════════════════════════════════════════════════════
// ManyChat → reply-verwerking. Instellen in ManyChat als External
// Request (POST) in de default reply-flow:
//   URL:  https://<domein>/api/manychat-reply
//   Body: { "secret": "<MANYCHAT_WEBHOOK_SECRET>",
//           "instagram": "{{ig_username}}",
//           "name": "{{full_name}}",
//           "text": "{{last_input_text}}" }
//
// Wat er dan gebeurt:
//  1. Prospect matchen op Instagram-handle
//  2. Stage → in_gesprek (reply is binnen), reply + tijdstip opslaan
//  3. AI schrijft een conceptantwoord in Menno's stem (nooit auto-verzenden)
//  4. Notificatie in de bel: "Reply van X — concept staat klaar"
// ════════════════════════════════════════════════════════════════

const DM_REPLY_TEMPLATE = `Je schrijft namens Menno Kater een antwoord in een lopend Instagram-DM-gesprek met een prospect.

STIJLREGELS (hard):
- Geen punten, komma's, trema's of gedachtestreepjes. Een vraagteken mag wel
- 1 tot 3 korte regels, elk op een eigen regel
- Warm, nieuwsgierig en behulpzaam, nooit pusherig
- Geen pitch en geen links, tenzij de prospect er expliciet om vraagt: dan mag je verwijzen naar een gratis kijkje of call
- Nederlands, spreektaal

CONTEXT:
{{onderwerp}}

Schrijf alleen het antwoord zelf.`;

function normHandle(v: string): string {
  return v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "MANYCHAT_WEBHOOK_SECRET niet geconfigureerd." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const given = String(body.secret ?? request.headers.get("x-webhook-secret") ?? "");
  if (given !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const instagram = normHandle(String(body.instagram ?? ""));
  const text = String(body.text ?? "").trim().slice(0, 1000);
  const name = String(body.name ?? "").trim();
  if (!instagram || !text) {
    return NextResponse.json({ ok: false, error: "instagram en text zijn verplicht" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "serverkey ontbreekt" }, { status: 503 });

  // Prospect matchen op handle (opgeslagen als @handle of kaal).
  const { data: candidates } = await admin
    .from("prospects")
    .select("id, agency_id, name, instagram, message, stage")
    .ilike("instagram", `%${instagram}%`)
    .limit(5);
  const prospect = (candidates ?? []).find((p) => normHandle(String(p.instagram ?? "")) === instagram) ?? candidates?.[0];

  if (!prospect) {
    // Geen prospect? Dan is het gewoon een lead/DM — alleen melden.
    const { data: agencies } = await admin.from("agencies").select("id").limit(1);
    if (agencies?.[0]) {
      await admin.from("notifications").insert({
        agency_id: agencies[0].id,
        audience: "agency",
        type: "info",
        title: `💬 DM van ${name || `@${instagram}`}`,
        body: text.slice(0, 200),
        link: "/platform/leads",
      });
    }
    return NextResponse.json({ ok: true, matched: false });
  }

  // 3. AI-conceptantwoord (best effort — reply-opslag mag nooit falen hierdoor).
  let draft: string | null = null;
  try {
    const context = [
      `Prospect: ${prospect.name} (@${instagram})`,
      prospect.message ? `Ons eerste bericht was:\n${prospect.message}` : null,
      `De prospect antwoordt nu:\n${text}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const { text: aiText, mock } = await generateText({ template: DM_REPLY_TEMPLATE, input: context, model: "fast" });
    if (!mock) draft = aiText.trim();
  } catch {
    draft = null;
  }

  // 2. Prospect bijwerken: reply vastleggen, stage mee laten bewegen.
  const patch: Record<string, unknown> = {
    last_reply: text,
    last_reply_at: new Date().toISOString(),
  };
  if (draft) patch.reply_draft = draft;
  if (["te_contacteren", "dm_verstuurd", "geen_reactie"].includes(String(prospect.stage))) {
    patch.stage = "in_gesprek";
  }
  await admin.from("prospects").update(patch).eq("id", prospect.id);

  // 4. Notificatie.
  await admin.from("notifications").insert({
    agency_id: prospect.agency_id,
    audience: "agency",
    type: "info",
    title: `💬 Reply van ${prospect.name}`,
    body: `"${text.slice(0, 140)}"${draft ? " — conceptantwoord staat klaar op de kaart." : ""}`,
    link: "/platform/outreach",
  });

  return NextResponse.json({ ok: true, matched: true, draft: Boolean(draft) });
}
