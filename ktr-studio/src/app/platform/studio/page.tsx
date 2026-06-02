"use client";

import { useState } from "react";
import { clients, generatedHooks } from "../_data";
import { PageHeader, Card, Badge, Eyebrow, icons } from "../_components";

const SAMPLE_SCRIPT = `HOOK (0–3s)
"Iedereen post elke dag — en niemand groeit. Dit is waarom."
[Talking head, recht in de camera, geen intro]

PROBLEEM (3–10s)
Je doet alles 'goed': consistent posten, waarde geven, mooie edits.
Maar je bereik blijft hangen. Want je vecht tegen het algoritme
in plaats van mét de kijker.

INZICHT (10–22s)
De eerste 3 seconden bepalen 90% van je bereik.
Niet je hashtags. Niet je posttijd. Je eerste frame.

BEWIJS (22–35s)
Ik testte dit met een klant: zelfde content, alleen ander openingsframe.
Resultaat: van 4.000 naar 84.000 views. Eén reel.

CTA (35–40s)
Wil je mijn frame-formule? Reageer met 'FRAME' en ik stuur 'm.`;

export default function Studio() {
  const [client, setClient] = useState(clients[0].name);
  const [topic, setTopic] = useState("");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedHook, setSelectedHook] = useState<number | null>(null);

  function generate() {
    setLoading(true);
    setGenerated(false);
    setSelectedHook(null);
    // Mock: in de echte build roept dit Claude aan via /api/studio
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
    }, 900);
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

          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">
            Klant
          </label>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.name} className="bg-card">
                {c.name} ({c.handle})
              </option>
            ))}
          </select>

          <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">
            Onderwerp / invalshoek
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="Bijv. 'waarom consistent posten niet werkt' of 'klant-resultaat van €40k'"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40 resize-none"
          />

          <div className="flex flex-wrap gap-2 mb-5">
            {["Contrarian", "Storytelling", "Educatief", "Klant-case"].map((t) => (
              <button
                key={t}
                className="rounded-full border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-1.5 text-[12px] text-muted transition-all"
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-3 transition-colors"
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
            Mock-output · in productie aangedreven door Claude
          </p>
        </Card>

        {/* Output */}
        <div className="lg:col-span-3 space-y-5">
          {!generated && !loading && (
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

          {generated && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-extrabold text-xl">Hook-opties</h2>
                  <Badge color="#34D399">{icons.check} {generatedHooks.length} gegenereerd</Badge>
                </div>
                <div className="space-y-2.5">
                  {generatedHooks.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedHook(i)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        selectedHook === i
                          ? "border-accent/40 bg-accent/[0.06]"
                          : "border-white/[0.07] hover:border-accent/25 bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-snug">&ldquo;{h.hook}&rdquo;</p>
                        <span className="shrink-0 font-mono text-[11px] text-accent">{h.score}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge color="#A78BFA">{h.angle}</Badge>
                        <span className="text-[11px] text-muted">hook-score {h.score}/100</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {selectedHook !== null && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-extrabold text-xl">Volledig script</h2>
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-white/[0.08] hover:border-accent/30 px-3 py-1.5 text-[12px] transition-all">
                        Kopieer
                      </button>
                      <button className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold px-3 py-1.5 text-[12px] transition-colors">
                        {icons.arrowRight} Naar pipeline
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground/85 bg-black/30 rounded-xl p-5 border border-white/[0.05]">
                    {SAMPLE_SCRIPT}
                  </pre>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
