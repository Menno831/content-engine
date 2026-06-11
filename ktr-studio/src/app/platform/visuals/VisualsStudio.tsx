"use client";

// ════════════════════════════════════════════════════════════════
// AI Thumbnails & visuals via Higgsfield Soul. Elke klant heeft één
// vast Soul-character (op het klantprofiel) — dat gaat automatisch
// mee, samen met brand-prompt + brand-kleuren. Echte generatie met
// poll-loop; resultaten worden bewaard in de historie.
// ════════════════════════════════════════════════════════════════
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Avatar, Eyebrow, icons } from "../_components";
import type { Generation } from "@/lib/data";

interface VisualClient {
  id: string;
  name: string;
  initials: string;
  soulCharacter: string | null;
  referenceImage: string | null;
  brandPrompt: string | null;
}

const PRESETS = [
  { label: "YouTube-thumbnail", prompt: "Close-up portrait, bold expressive face, dramatic studio lighting, high contrast, clean background with room for text, thumbnail style" },
  { label: "Reel-cover", prompt: "Confident standing pose, cinematic lighting, shallow depth of field, premium personal brand look" },
  { label: "Quote-achtergrond", prompt: "Moody minimal scene, soft gradient light, lots of negative space for text overlay" },
];

export function VisualsStudio({ clients, configured, history }: { clients: VisualClient[]; configured: boolean; history: Generation[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [size, setSize] = useState<"square" | "portrait">("square");
  const [prompt, setPrompt] = useState("");
  const [useBrand, setUseBrand] = useState(true);
  const [phase, setPhase] = useState<"idle" | "submit" | "render">("idle");
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";

  async function api(payload: Record<string, unknown>) {
    const res = await fetch("/api/visuals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function generate() {
    if (!prompt.trim() || phase !== "idle") return;
    setError(null);
    setUrls([]);
    setPhase("submit");
    try {
      const start = await api({ action: "generate", client_id: clientId, prompt: prompt.trim(), size, use_brand: useBrand });
      if (!start.ok) throw new Error(start.error ?? "Starten mislukt.");

      setPhase("render");
      // Poll tot klaar (max ~4 min).
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const poll = await api({ action: "poll", job_set_id: start.job_set_id, client_id: clientId, prompt: prompt.trim() });
        if (!poll.ok) throw new Error(poll.error ?? "Genereren mislukt.");
        if (poll.done) {
          setUrls(poll.urls ?? []);
          setPhase("idle");
          router.refresh();
          return;
        }
      }
      throw new Error("Duurt te lang — check je Higgsfield-account en probeer opnieuw.");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    }
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
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-3 outline-none focus:border-accent/40"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
          ))}
        </select>

        {/* Character-status: vast character = consistent gezicht in alles */}
        <div className={`rounded-xl border p-3.5 mb-4 ${client?.soulCharacter ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-amber-400/25 bg-amber-400/[0.05]"}`}>
          <div className="flex items-center gap-3">
            {client?.referenceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.referenceImage} alt={client.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <Avatar initials={client?.initials ?? "?"} size={36} />
            )}
            <div className="min-w-0 text-[12.5px]">
              {client?.soulCharacter ? (
                <>
                  <div className="font-medium text-emerald-300 flex items-center gap-1">{icons.check} Vast character actief</div>
                  <div className="text-muted truncate font-mono text-[11px]">{client.soulCharacter}</div>
                </>
              ) : (
                <div className="text-amber-300 leading-snug">
                  Geen Soul-character gekoppeld — maak er één in Higgsfield en plak het id op het klantprofiel. Eenmaal gezet blijft het gezicht in élke generatie hetzelfde.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formaat */}
        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Formaat</label>
        <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1 mb-4">
          {([
            { key: "square", label: "Thumbnail / post (1:1)" },
            { key: "portrait", label: "Story / cover (3:4)" },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setSize(s.key)}
              className={`flex-1 rounded-lg py-1.5 text-[12px] transition-all ${size === s.key ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPrompt(p.prompt)}
              className="rounded-full border border-white/[0.08] hover:border-accent/30 hover:text-accent text-muted px-3 py-1 text-[11.5px] transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Beschrijf het beeld… (Engels werkt het best voor beeldgeneratie)"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-3 outline-none focus:border-accent/40 resize-y"
        />

        <label className="flex items-center gap-2 text-[12.5px] text-muted mb-4 cursor-pointer">
          <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} className="accent-[#F97316]" />
          Brand-prompt + kleuren van {client?.name ?? "de klant"} meesturen
        </label>

        <button
          onClick={generate}
          disabled={phase !== "idle" || !prompt.trim() || !configured}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-3 transition-colors"
        >
          {phase === "submit" ? (
            <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Starten…</>
          ) : phase === "render" ? (
            <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Renderen… (±1 min)</>
          ) : (
            <>{icons.spark} Genereer 4 varianten</>
          )}
        </button>
        {!configured && (
          <p className="mt-3 text-[11px] text-amber-300/90 text-center">
            HIGGSFIELD_API_KEY ontbreekt in Vercel (formaat KEY_ID:KEY_SECRET) — daarna werkt dit live.
          </p>
        )}
        {error && <p className="mt-3 text-[12px] text-red-400">{error}</p>}
      </Card>

      {/* Output + historie */}
      <div className="lg:col-span-3 space-y-5">
        {urls.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-xl">Resultaat</h2>
              <Badge color="#34D399">{icons.check} {urls.length} varianten</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {urls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="group relative rounded-xl overflow-hidden border border-white/[0.07]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="Generatie" className="w-full object-cover group-hover:scale-[1.02] transition-transform" />
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">Open ↗</span>
                </a>
              ))}
            </div>
          </Card>
        )}

        {phase === "render" && urls.length === 0 && (
          <Card className="p-8">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          </Card>
        )}

        {history.length > 0 ? (
          <Card className="p-6">
            <h2 className="font-display font-extrabold text-lg mb-4">Eerder gegenereerd</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {history.map((g) => (
                <a key={g.id} href={g.url} target="_blank" rel="noopener noreferrer" className="group relative rounded-lg overflow-hidden border border-white/[0.06]" title={`${clientName(g.clientId)} · ${g.prompt}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.prompt} className="aspect-square w-full object-cover group-hover:scale-[1.03] transition-transform" />
                </a>
              ))}
            </div>
          </Card>
        ) : (
          urls.length === 0 && phase !== "render" && (
            <Card className="p-12 text-center border-dashed">
              <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-4">{icons.spark}</span>
              <h3 className="font-display font-bold text-lg mb-1">Nog geen visuals</h3>
              <p className="text-muted text-sm max-w-sm mx-auto">
                Kies een klant en een preset — het vaste Soul-character zorgt dat het gezicht in elke generatie hetzelfde blijft.
              </p>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
