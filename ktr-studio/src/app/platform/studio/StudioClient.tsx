"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, Eyebrow, icons } from "../_components";

export interface StudioClientInfo {
  id: string;
  name: string;
  handle: string;
}

const TONES = ["Contrarian", "Storytelling", "Educatief", "Klant-case"];

async function callAI(template: string, input: string, clientId: string): Promise<{ text: string; mock: boolean; error?: string }> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // fast: hooks/scripts draaien op Haiku (5x goedkoper, ruim snel genoeg).
      body: JSON.stringify({ template, input, client_id: clientId, fast: true }),
    });
    const data = await res.json();
    if (!data.ok) return { text: "", mock: false, error: data.error ?? "Er ging iets mis." };
    return { text: data.text, mock: Boolean(data.mock) };
  } catch {
    return { text: "", mock: false, error: "Er ging iets mis bij het genereren." };
  }
}

function parseHooks(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").replace(/^["'“”]+|["'“”]+$/g, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 8);
}

export function StudioClient({ clients }: { clients: StudioClientInfo[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const client = clients.find((c) => c.id === clientId)?.name ?? "de klant";
  const [topic, setTopic] = useState("");
  const [tones, setTones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState<string[] | null>(null);
  const [mock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  function toggleTone(t: string) {
    setTones((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setHooks(null);
    setSelectedHook(null);
    setScript(null);
    setError(null);

    const toneStr = tones.length ? ` Toon: ${tones.join(", ")}.` : "";
    const template = `Genereer 5 scroll-stopping reel-hooks voor de personal brand van ${client} over het onderwerp "{{onderwerp}}".${toneStr} Geef alleen de hooks, één per regel, zonder nummering of aanhalingstekens.`;
    const { text, mock: isMock, error: err } = await callAI(template, topic, clientId);
    if (err) setError(err);
    else {
      setHooks(parseHooks(text));
      setMock(isMock);
    }
    setLoading(false);
  }

  async function selectHook(hook: string) {
    setSelectedHook(hook);
    setScript(null);
    setScriptLoading(true);
    const template = `Schrijf een volledig reel-script van ~40 seconden voor ${client} op basis van deze hook: "${hook}". Onderwerp: "{{onderwerp}}". Gebruik secties: HOOK (0-3s), PROBLEEM, INZICHT, BEWIJS, CTA. Voeg korte regie-aanwijzingen toe tussen [haakjes].`;
    const { text, error: err } = await callAI(template, topic, clientId);
    setScript(err ? err : text);
    setScriptLoading(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Studio · AI"
        title="Hook & script generator"
        subtitle="Genereer scroll-stopping hooks en volledige reel-scripts, afgestemd op de tone-of-voice van elke klant."
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input */}
        <Card className="lg:col-span-2 p-6 h-fit lg:sticky lg:top-24">
          <Eyebrow>Briefing</Eyebrow>
          <h2 className="font-display font-extrabold text-xl mb-5">Wat maken we?</h2>

          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Klant</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-card">
                {c.name} {c.handle ? `(${c.handle})` : ""}
              </option>
            ))}
          </select>
          <p className="-mt-2 mb-4 text-[11px] text-muted">
            De vastgelegde brand voice van deze klant wordt automatisch meegestuurd.
          </p>

          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Onderwerp / invalshoek</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="Bijv. 'waarom consistent posten niet werkt' of 'klant-resultaat van €40k'"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40 resize-none"
          />

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
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-3 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Genereren…
              </>
            ) : (
              <>{icons.spark} Genereer ideeën</>
            )}
          </button>
          <p className="mt-3 text-[11px] text-muted text-center">
            {mock ? "Mock-output · koppel ANTHROPIC_API_KEY voor echt" : "Aangedreven door Claude"}
          </p>
        </Card>

        {/* Output */}
        <div className="lg:col-span-3 space-y-5">
          {!hooks && !loading && !error && (
            <Card className="p-12 text-center border-dashed">
              <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-4">
                {icons.spark}
              </span>
              <h3 className="font-display font-bold text-lg mb-1">Nog niks gegenereerd</h3>
              <p className="text-muted text-sm max-w-sm mx-auto">
                Vul een briefing in en genereer hooks + een volledig script in seconden.
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

          {hooks && hooks.length > 0 && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-extrabold text-xl">Hook-opties</h2>
                  <Badge color="#34D399">{icons.check} {hooks.length} gegenereerd</Badge>
                </div>
                <div className="space-y-2.5">
                  {hooks.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => selectHook(h)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        selectedHook === h
                          ? "border-accent/40 bg-accent/[0.06]"
                          : "border-white/[0.07] hover:border-accent/25 bg-white/[0.01]"
                      }`}
                    >
                      <p className="text-sm leading-snug">&ldquo;{h}&rdquo;</p>
                    </button>
                  ))}
                </div>
              </Card>

              {selectedHook && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-extrabold text-xl">Volledig script</h2>
                    {script && (
                      <button
                        onClick={() => navigator.clipboard?.writeText(script)}
                        className="rounded-lg border border-white/[0.08] hover:border-accent/30 px-3 py-1.5 text-[12px] transition-all"
                      >
                        Kopieer
                      </button>
                    )}
                  </div>
                  {scriptLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-3 rounded bg-white/[0.05] animate-pulse" style={{ width: `${90 - i * 6}%` }} />
                      ))}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground/85 bg-black/30 rounded-xl p-5 border border-white/[0.05]">
                      {script}
                    </pre>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
