"use client";

import { useState } from "react";
import { Card, Badge, Avatar, Eyebrow, icons } from "../_components";

interface VisualClient {
  id: string;
  name: string;
  initials: string;
  soulCharacter: string | null;
  referenceImage: string | null;
  brandPrompt: string | null;
}

interface GenResult {
  id: number;
  prompt: string;
  kind: "image" | "video";
  hue: number;
}

export function VisualsStudio({ clients, configured }: { clients: VisualClient[]; configured: boolean }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [useBrand, setUseBrand] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GenResult[]>([]);

  const client = clients.find((c) => c.id === clientId) ?? clients[0];

  function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    // Mock: in productie -> Higgsfield-MCP/API met soul_character_id + referentie.
    setTimeout(() => {
      const n = kind === "image" ? 4 : 2;
      const base = Date.now();
      setResults(
        Array.from({ length: n }).map((_, i) => ({
          id: base + i,
          prompt: prompt.trim(),
          kind,
          hue: (base / 1000 + i * 40) % 360,
        }))
      );
      setLoading(false);
    }, 1100);
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Character + briefing */}
      <Card className="lg:col-span-2 p-6 h-fit lg:sticky lg:top-24">
        <Eyebrow>Soul-character</Eyebrow>
        <h2 className="font-display font-extrabold text-xl mb-4">Klant & character</h2>

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Klant</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-5 outline-none focus:border-accent/40"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
          ))}
        </select>

        {client && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] p-4">
            <div className="flex items-center gap-3 mb-3">
              {client.referenceImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={client.referenceImage} alt={client.name} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl grid place-items-center bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/20">
                  <Avatar initials={client.initials} size={36} />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{client.name}</div>
                {client.soulCharacter ? (
                  <Badge color="#34D399">{icons.check} character actief</Badge>
                ) : (
                  <Badge color="#FBBF24">geen character</Badge>
                )}
              </div>
            </div>
            <div className="text-[11px] font-mono text-muted mb-1">Character-id</div>
            <code className="text-[12px] text-foreground/80 bg-black/30 rounded-lg px-2 py-1 border border-white/[0.06]">
              {client.soulCharacter ?? "— nog niet aangemaakt —"}
            </code>

            <div className="text-[11px] font-mono text-muted mt-4 mb-1">Brand-prompt (vast)</div>
            <p className="text-[12px] text-foreground/75 leading-relaxed">{client.brandPrompt ?? "—"}</p>

            <button className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent py-2 text-[12px] transition-all">
              {icons.plus} Referentiefoto toevoegen
            </button>
          </div>
        )}
      </Card>

      {/* Prompt + output */}
      <div className="lg:col-span-3 space-y-5">
        {!configured && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3 text-[13px] text-amber-200/90">
            <span className="font-semibold">Higgsfield niet gekoppeld.</span> Dit is voorbeeldoutput. Koppel je
            Higgsfield-account (env <code className="font-mono text-[12px]">HIGGSFIELD_API_KEY</code>) om écht te genereren met het Soul-character.
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setKind("image")}
              className={`rounded-lg px-3 py-1.5 text-[13px] transition-all ${kind === "image" ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-foreground"}`}
            >
              Afbeelding
            </button>
            <button
              onClick={() => setKind("video")}
              className={`rounded-lg px-3 py-1.5 text-[13px] transition-all ${kind === "video" ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-foreground"}`}
            >
              Video
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={`Beschrijf de ${kind === "image" ? "thumbnail/afbeelding" : "video"} — het character wordt automatisch herkend. Bijv. 'praat recht in camera, kantoor, avondlicht'`}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-none mb-3"
          />

          <label className="flex items-center gap-2 text-[13px] text-muted mb-4 cursor-pointer">
            <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} className="accent-[#F97316]" />
            Brand-prompt van {client?.name ?? "klant"} automatisch meesturen
          </label>

          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-3 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Genereren…
              </>
            ) : (
              <>{icons.spark} Genereer {kind === "image" ? "afbeelding" : "video"}</>
            )}
          </button>
        </Card>

        {results.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display font-bold text-lg mb-4">Resultaten</h3>
            <div className={`grid gap-3 ${kind === "image" ? "grid-cols-2" : "grid-cols-1"}`}>
              {results.map((r) => (
                <div key={r.id} className="rounded-xl overflow-hidden border border-white/[0.06]">
                  <div
                    className="aspect-[9/16] grid place-items-center relative"
                    style={{ background: `linear-gradient(135deg, hsl(${r.hue} 60% 18%), hsl(${(r.hue + 40) % 360} 55% 10%))` }}
                  >
                    <span className="text-[11px] font-mono text-white/70 px-3 text-center">
                      {client?.soulCharacter ?? "character"} · {r.kind}
                    </span>
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/40 rounded px-1.5 py-0.5 text-white/70">
                      mock
                    </span>
                  </div>
                  <div className="p-2.5 text-[11px] text-muted line-clamp-2 bg-card">{r.prompt}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted text-center">Voorbeeldoutput · in productie via Higgsfield Soul</p>
          </Card>
        )}
      </div>
    </div>
  );
}
