"use client";

import { useState, useTransition } from "react";
import { PageHeader, Card, Badge, Eyebrow, icons } from "../_components";
import { scriptToBoardAction } from "../pipeline/actions";

export interface StudioClientInfo {
  id: string;
  name: string;
  handle: string;
}

const TONES = ["Contrarian", "Storytelling", "Educatief", "Klant-case"];

interface Idea {
  title: string;
  angle: string;
  hook: string;
}

async function callAI(template: string, input: string, clientId: string, useBrain = false): Promise<{ text: string; mock: boolean; error?: string }> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // fast: ideeën/scripts draaien op Haiku (5x goedkoper, ruim snel genoeg).
      body: JSON.stringify({ template, input, client_id: clientId, fast: true, use_brain: useBrain }),
    });
    const data = await res.json();
    if (!data.ok) return { text: "", mock: false, error: data.error ?? "Er ging iets mis." };
    return { text: data.text, mock: Boolean(data.mock) };
  } catch {
    return { text: "", mock: false, error: "Er ging iets mis bij het genereren." };
  }
}

// "### IDEE"-blokken -> {title, angle, hook}
function parseIdeas(text: string): Idea[] {
  return text
    .split(/###\s*IDEE/i)
    .map((block) => {
      const title = block.match(/TITEL:\s*(.+)/i)?.[1]?.trim() ?? "";
      const angle = block.match(/INVALSHOEK:\s*(.+)/i)?.[1]?.trim() ?? "";
      const hook = block.match(/HOOK:\s*(.+)/i)?.[1]?.trim() ?? "";
      return { title, angle, hook };
    })
    .filter((i) => i.title && i.hook)
    .slice(0, 10);
}

// Verboden AI-clichés — meegestuurd in elke script-prompt.
const KILLER_RULES = `Regels voor een killer script:
- Schrijf SPREEKTAAL zoals deze persoon écht praat (volg de brand voice strikt) — korte zinnen, geen schrijftaal.
- Verboden clichés: "in deze video", "laten we erin duiken", "game-changer", "het verschil maken", "naar een hoger niveau", "stay tuned".
- Opbouw: HOOK (0-3s, patroonbreker) → CONTEXT (waarom moet de kijker dit horen) → SPANNING/INZICHT (het echte vlees) → BEWIJS of voorbeeld → CTA (één concrete actie).
- Lengte: 35-45 seconden uitgesproken (~110-140 woorden).
- Voeg korte regie-aanwijzingen toe tussen [haakjes] (shot, tekst-op-scherm, b-roll).`;

export function StudioClient({ clients }: { clients: StudioClientInfo[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const client = clients.find((c) => c.id === clientId)?.name ?? "de klant";

  const [mode, setMode] = useState<"onderwerp" | "transcript">("onderwerp");
  const [topic, setTopic] = useState("");
  const [transcript, setTranscript] = useState("");
  const [tones, setTones] = useState<string[]>([]);
  const [useBrain, setUseBrain] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scripts, setScripts] = useState<{ idea: Idea; text: string }[]>([]);
  const [scriptProgress, setScriptProgress] = useState<string | null>(null);

  const sourceInput = mode === "transcript" ? transcript.slice(0, 30_000) : topic;
  const canGenerate = mode === "transcript" ? transcript.trim().length > 50 : topic.trim().length > 2;

  function toggleTone(t: string) {
    setTones((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function toggleIdea(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function generateIdeas() {
    setLoading(true);
    setIdeas(null);
    setSelected(new Set());
    setScripts([]);
    setError(null);

    const toneStr = tones.length ? ` Gewenste tonen: ${tones.join(", ")}.` : "";
    const base =
      mode === "transcript"
        ? `Hieronder staat een transcript (call/podcast/opname) van of met ${client}. Haal er de 8 sterkste content-ideeën voor Reels uit. Gebruik UITSLUITEND verhalen, meningen, uitspraken en voorbeelden die ECHT in het transcript staan — verzin niets.${toneStr}`
        : `Genereer 8 sterke, verschillende Reel-ideeën voor de personal brand van ${client} over: "{{onderwerp}}".${toneStr} Maak ze concreet en scherp — geen generieke contenttips.`;

    const template = `${base}

Output EXACT in dit formaat per idee, niets eromheen:
### IDEE
TITEL: korte werktitel
INVALSHOEK: waarom dit werkt / welke snaar het raakt (1 zin)
HOOK: de letterlijke openingszin (scroll-stopper, geen aanhalingstekens)`;

    const { text, mock: isMock, error: err } = await callAI(template, sourceInput, clientId, useBrain);
    if (err) setError(err);
    else {
      const parsed = parseIdeas(text);
      if (parsed.length === 0) setError("Geen bruikbare ideeën terug — probeer het opnieuw of pas je input aan.");
      else {
        setIdeas(parsed);
        setMock(isMock);
      }
    }
    setLoading(false);
  }

  async function writeScripts() {
    if (!ideas || selected.size === 0) return;
    const chosen = [...selected].map((i) => ideas[i]).filter(Boolean);
    setScripts([]);
    for (const idea of chosen) {
      setScriptProgress(idea.title);
      const context =
        mode === "transcript"
          ? `Bronmateriaal (gebruik echte uitspraken/voorbeelden hieruit): {{onderwerp}}`
          : `Onderwerp: {{onderwerp}}`;
      const template = `Schrijf een volledig Reel-script voor ${client}.
Idee: ${idea.title}
Invalshoek: ${idea.angle}
Openings-hook (gebruik deze of een sterkere variant): "${idea.hook}"

${KILLER_RULES}

${context}

Output: eerst 3 HOOK-VARIANTEN (één per regel), dan het SCRIPT met regie-aanwijzingen, dan de CTA.`;
      const { text, error: err } = await callAI(template, sourceInput, clientId, useBrain);
      setScripts((prev) => [...prev, { idea, text: err ?? text }]);
    }
    setScriptProgress(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Studio · AI"
        title="Van input naar killer script"
        subtitle="Gooi een onderwerp of een heel transcript erin → kies de beste ideeën → krijg scripts in de stem van je klant."
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input */}
        <Card className="lg:col-span-2 p-6 h-fit lg:sticky lg:top-24">
          <Eyebrow>Stap 1 · Bron</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-5">Wat is de input?</h2>

          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Klant</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-1 outline-none focus:border-accent/40"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-card">
                {c.name} {c.handle ? `(${c.handle})` : ""}
              </option>
            ))}
          </select>
          <p className="mb-4 text-[11px] text-muted">Brand voice van deze klant gaat automatisch mee.</p>

          {/* Bron-modus */}
          <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1 mb-4">
            {(["onderwerp", "transcript"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-1.5 text-[12.5px] transition-all ${
                  mode === m ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"
                }`}
              >
                {m === "onderwerp" ? "Onderwerp" : "Transcript / call"}
              </button>
            ))}
          </div>

          {mode === "onderwerp" ? (
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="Bijv. 'waarom consistent posten niet werkt' of 'klant-resultaat van €40k'"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40 resize-none"
            />
          ) : (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Plak hier een heel transcript (call, podcast, brainstorm)… De AI haalt er de sterkste content-ideeën uit — alleen dingen die er écht in staan."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[12.5px] font-mono mb-4 outline-none focus:border-accent/40 resize-y leading-relaxed"
            />
          )}

          <label className="flex items-center gap-2 text-[12.5px] text-muted mb-4 cursor-pointer">
            <input type="checkbox" checked={useBrain} onChange={(e) => setUseBrain(e.target.checked)} className="accent-[#F97316]" />
            Second brain meenemen (kennisbank van je boards als context)
          </label>

          <div className="flex flex-wrap gap-2 mb-5">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => toggleTone(t)}
                className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                  tones.includes(t)
                    ? "bg-accent text-background font-bold"
                    : "border border-white/[0.08] hover:border-accent/30 hover:text-accent text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={generateIdeas}
            disabled={loading || !canGenerate}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-3 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Ideeën genereren…
              </>
            ) : (
              <>{icons.spark} Genereer contentideeën</>
            )}
          </button>
          <p className="mt-3 text-[11px] text-muted text-center">
            {mock ? "Mock-output · koppel ANTHROPIC_API_KEY voor echt" : "Aangedreven door Claude"}
          </p>
        </Card>

        {/* Output */}
        <div className="lg:col-span-3 space-y-5">
          {!ideas && !loading && !error && (
            <Card className="p-12 text-center border-dashed">
              <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-4">
                {icons.spark}
              </span>
              <h3 className="font-display font-bold text-lg mb-1">Nog niks gegenereerd</h3>
              <p className="text-muted text-sm max-w-sm mx-auto">
                Kies een bron links. Tip: een transcript van een call levert de persoonlijkste ideeën op.
              </p>
            </Card>
          )}

          {error && (
            <Card className="p-6 border-red-400/30 bg-red-400/[0.05]">
              <p className="text-sm text-red-300">{error}</p>
            </Card>
          )}

          {loading && (
            <Card className="p-8 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-3 rounded bg-white/[0.06]" style={{ width: `${80 - i * 8}%` }} />
                  <div className="h-3 rounded bg-white/[0.04]" style={{ width: `${60 - i * 6}%` }} />
                </div>
              ))}
            </Card>
          )}

          {ideas && ideas.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-extrabold text-xl">Stap 2 · Kies je ideeën</h2>
                <Badge color="#34D399">{icons.check} {ideas.length} ideeën</Badge>
              </div>
              <p className="text-muted text-sm mb-4">Vink aan waar je écht iets mee hebt — daar schrijven we volledige scripts voor.</p>
              <div className="space-y-2.5">
                {ideas.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => toggleIdea(i)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      selected.has(i)
                        ? "border-accent/50 bg-accent/[0.07]"
                        : "border-white/[0.07] hover:border-accent/25 bg-white/[0.01]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 grid place-items-center w-5 h-5 rounded-md border text-[11px] shrink-0 ${
                          selected.has(i) ? "bg-accent border-accent text-background" : "border-white/[0.15] text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm mb-0.5">{idea.title}</div>
                        <p className="text-[12px] text-muted leading-snug mb-1.5">{idea.angle}</p>
                        <p className="text-[13px] text-foreground/85 leading-snug">&ldquo;{idea.hook}&rdquo;</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={writeScripts}
                disabled={selected.size === 0 || Boolean(scriptProgress)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-3 transition-colors"
              >
                {scriptProgress ? (
                  <>
                    <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Script: {scriptProgress}…
                  </>
                ) : (
                  <>{icons.arrowRight} Schrijf {selected.size || ""} script{selected.size === 1 ? "" : "s"}</>
                )}
              </button>
            </Card>
          )}

          {scripts.map(({ idea, text }, i) => (
            <ScriptCard key={i} clientId={clientId} idea={idea} text={text} />
          ))}
        </div>
      </div>
    </>
  );
}

function ScriptCard({ clientId, idea, text }: { clientId: string; idea: Idea; text: string }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<{ ok: boolean; msg: string } | null>(null);

  function toBoard() {
    setSaved(null);
    start(async () => {
      const r = await scriptToBoardAction({ clientId, title: idea.title, hook: idea.hook, script: text });
      setSaved({ ok: Boolean(r.ok), msg: r.ok ?? r.error ?? "" });
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display font-extrabold text-lg min-w-0 truncate">{idea.title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigator.clipboard?.writeText(text)}
            className="rounded-lg border border-white/[0.08] hover:border-accent/30 px-3 py-1.5 text-[12px] transition-all"
          >
            Kopieer
          </button>
          <button
            onClick={toBoard}
            disabled={pending || saved?.ok}
            className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold px-3 py-1.5 text-[12px] transition-colors"
          >
            {saved?.ok ? "Op board ✓" : pending ? "…" : <>{icons.arrowRight} Op productieboard</>}
          </button>
        </div>
      </div>
      {saved && !saved.ok && <p className="mb-3 text-[12px] text-red-400">{saved.msg}</p>}
      {saved?.ok && <p className="mb-3 text-[12px] text-emerald-400">{saved.msg}</p>}
      <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground/85 bg-black/30 rounded-xl p-5 border border-white/[0.05]">
        {text}
      </pre>
    </Card>
  );
}
