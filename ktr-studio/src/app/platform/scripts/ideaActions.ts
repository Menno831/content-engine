"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/guard";
import { generateText, isClaudeConfigured } from "@/lib/ai";
import { scriptSkeleton } from "@/lib/ideas-shared";

export interface IdeaResult {
  ok?: boolean;
  error?: string;
  message?: string;
  scriptId?: string;
}

export async function setIdeaStatusAction(ideaId: string, status: string): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("content_ideas").update({ status }).eq("id", ideaId);
  if (error) return { error: error.message };
  revalidatePath("/platform/scripts");
  return { ok: true };
}

export async function deleteIdeaAction(ideaId: string): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("content_ideas").delete().eq("id", ideaId);
  if (error) return { error: error.message };
  revalidatePath("/platform/scripts");
  return { ok: true };
}

/** Idee → script: maakt een script aan met de vaste structuur ingevuld. */
export async function ideaToScriptAction(ideaId: string): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };

  const { data: idea, error: readErr } = await auth.supabase
    .from("content_ideas")
    .select("id,title,hook,angle,pillar,format,client_id,script_id")
    .eq("id", ideaId)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!idea) return { error: "Idee niet gevonden." };
  if (idea.script_id) return { ok: true, scriptId: idea.script_id as string, message: "Er stond al een script bij dit idee." };

  const { data: script, error } = await auth.supabase
    .from("scripts")
    .insert({
      agency_id: auth.agency.id,
      client_id: idea.client_id,
      title: idea.title,
      content: scriptSkeleton(idea),
      status: "to_write",
      tag: idea.pillar ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await auth.supabase
    .from("content_ideas")
    .update({ status: "gemaakt", script_id: script.id })
    .eq("id", ideaId);

  revalidatePath("/platform/scripts");
  return { ok: true, scriptId: script.id as string, message: "Script aangemaakt met je vaste structuur." };
}

// ── Nieuwe ideeën uit je eigen bronnen ──────────────────────────
const IDEEEN_PROMPT = `Je bent de contentstrateeg van Menno Kater. Je kent zijn merk:

- Positionering: "visionary operator" — geen videograaf maar operator die groei bouwt.
- Persoonlijke missie: van passief verdienen (±20k/mnd, weinig werken) naar actief
  bouwen aan generationele welvaart voor zijn familie. Hij wil juist MEER werken.
- Drie pijlers: Value (wat hij weet over YouTube/content/groei), Documentation (waar
  hij nu mee bezig is, achter de schermen), Lifestyle (reizen, vrijheid, het leven).
- Stijl: rauw boven gepolijst. Koud openen, geen intro. Eén concreet detail (bedrag,
  datum, plek) in plaats van vage claims. Persoonlijk verhaal boven generieke tips.
- Alles wat hij post hoort bij één doorlopend verhaal, als seizoenen van een serie.

Hieronder staan fragmenten uit zijn echte calls en gesprekken. Haal daar content-ideeën
uit. Regels:
- Alleen ideeën die je kunt onderbouwen met iets wat er letterlijk staat. Verzin geen
  cijfers, plekken of gebeurtenissen.
- Elk idee moet iets van hem persoonlijk bevatten — een moment, een getal, een twijfel.
  Generieke tips zijn waardeloos.
- De hook is een letterlijk bruikbare openingszin, geen omschrijving.
- Varieer over de drie pijlers en over formats (Reel, Carrousel, Longform, Story).

Antwoord met alleen een JSON-array, niets eromheen. Per idee:
{"title": "korte werktitel",
 "hook": "de letterlijke openingszin",
 "angle": "in 1-2 zinnen: wat erin moet en waarom dit werkt voor hem",
 "pillar": "Value" | "Documentation" | "Lifestyle",
 "format": "Reel" | "Carrousel" | "Longform" | "Story",
 "source_note": "waar dit vandaan komt, bv. 'call met Seth 15 sep — Tulum-carrousel'"}

Geef er 8 tot 12.`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateIdeasAction(): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!isClaudeConfigured()) return { error: "ANTHROPIC_API_KEY ontbreekt — zet 'm in Vercel." };

  const { data: sources, error: srcErr } = await auth.supabase
    .from("idea_sources")
    .select("id,title,happened_on,content")
    .order("happened_on", { ascending: false })
    .limit(12);
  if (srcErr) return { error: srcErr.message };
  if (!sources?.length) {
    return { error: "Nog geen bronnen. Voeg eerst een call of gesprek toe onder Bronnen." };
  }

  // Wat er al ligt niet nog eens voorstellen.
  const { data: existing } = await auth.supabase.from("content_ideas").select("title").limit(200);
  const known = (existing ?? []).map((r: any) => r.title).join(" · ");

  const input = [
    ...sources.map((s: any) => `── ${s.title}${s.happened_on ? ` (${String(s.happened_on).slice(0, 10)})` : ""}\n${s.content}`),
    known ? `\n\nBESTAANDE IDEEËN (niet herhalen):\n${known}` : "",
  ].join("\n\n");

  const { text, mock } = await generateText({ template: IDEEEN_PROMPT, input, model: "smart" });
  if (mock) return { error: "AI gaf geen antwoord — controleer ANTHROPIC_API_KEY en het tegoed." };

  // De JSON uit het antwoord vissen; een model zet er soms tekst omheen.
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return { error: "Kon het antwoord niet lezen — probeer het nog eens." };

  let parsed: any[];
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { error: "Kon het antwoord niet lezen — probeer het nog eens." };
  }

  const sourceByTitle = new Map(sources.map((s: any) => [String(s.title).toLowerCase(), s.id]));
  const rows = parsed
    .filter((p) => p && typeof p.title === "string" && p.title.trim())
    .slice(0, 15)
    .map((p) => {
      // Bron koppelen als het model een herkenbare titel noemt.
      const note = String(p.source_note ?? "").toLowerCase();
      let sourceId: string | null = null;
      for (const [title, id] of sourceByTitle) {
        if (note.includes(title.slice(0, 18))) {
          sourceId = id as string;
          break;
        }
      }
      return {
        agency_id: auth.agency.id,
        title: String(p.title).trim().slice(0, 160),
        hook: p.hook ? String(p.hook).trim().slice(0, 400) : null,
        angle: p.angle ? String(p.angle).trim().slice(0, 800) : null,
        pillar: ["Value", "Documentation", "Lifestyle"].includes(p.pillar) ? p.pillar : null,
        format: ["Reel", "Carrousel", "Longform", "Story"].includes(p.format) ? p.format : null,
        source_note: p.source_note ? String(p.source_note).trim().slice(0, 200) : null,
        source_id: sourceId,
        status: "nieuw",
      };
    });

  if (!rows.length) return { error: "Geen bruikbare ideeën teruggekregen." };

  const { error } = await auth.supabase.from("content_ideas").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: true, message: `${rows.length} nieuwe ideeën uit je calls.` };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function addSourceAction(input: {
  title: string;
  kind: string;
  happenedOn: string;
  url: string;
  content: string;
}): Promise<IdeaResult> {
  const auth = await requireTeam();
  if ("error" in auth) return { error: auth.error };
  if (!input.title.trim()) return { error: "Geef de bron een titel." };
  if (input.content.trim().length < 50) return { error: "Plak wat meer tekst — hier valt nu niks uit te halen." };

  const { error } = await auth.supabase.from("idea_sources").insert({
    agency_id: auth.agency.id,
    kind: input.kind || "call",
    title: input.title.trim(),
    happened_on: input.happenedOn || null,
    url: input.url.trim() || null,
    content: input.content.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath("/platform/scripts");
  return { ok: true, message: "Bron toegevoegd." };
}
