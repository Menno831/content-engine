"use client";

// ════════════════════════════════════════════════════════════════
// Boost (Eden-stijl): één kern-idee -> meerdere formats/platforms in
// de brand voice van de klant. Elk format heeft zijn eigen prompt-
// recept; ze worden parallel gegenereerd en als losse kaarten getoond.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { Card, Badge, Eyebrow, icons } from "../_components";

interface ClientInfo {
  id: string;
  name: string;
  handle: string;
}
interface SavedItem {
  id: string;
  label: string;
  text: string;
}

interface FormatDef {
  key: string;
  label: string;
  emoji: string;
  recipe: (client: string) => string;
}

const FORMATS: FormatDef[] = [
  {
    key: "reel",
    label: "Reel-script",
    emoji: "🎬",
    recipe: () =>
      "Schrijf een Reel-script van ~40 sec: HOOK (0-3s, patroonbreker), CONTEXT, INZICHT, BEWIJS, CTA. Spreektaal, korte zinnen, regie-aanwijzingen tussen [haakjes]. Geef ook 3 hook-varianten bovenaan.",
  },
  {
    key: "carrousel",
    label: "Carrousel",
    emoji: "🗂️",
    recipe: () =>
      "Schrijf een carrousel van 6-8 slides. Slide 1 = scroll-stopper hook. Elke volgende slide één kernpunt, kort en puntig. Laatste slide = CTA. Geef per slide: 'SLIDE n: <tekst>'.",
  },
  {
    key: "story",
    label: "Story-serie",
    emoji: "📲",
    recipe: () =>
      "Schrijf een Instagram story-serie van 4-5 frames die naar één actie toewerkt. Per frame: korte tekst-op-scherm + (sticker/poll-suggestie). Persoonlijk en direct.",
  },
  {
    key: "linkedin",
    label: "LinkedIn-post",
    emoji: "💼",
    recipe: () =>
      "Schrijf een LinkedIn-post: sterke openingsregel, korte alinea's met witregels, één duidelijk inzicht, afsluiten met een vraag of CTA. Professioneel maar menselijk, geen hashtags-spam (max 3).",
  },
  {
    key: "thread",
    label: "X / thread",
    emoji: "🧵",
    recipe: () =>
      "Schrijf een X-thread van 5-7 tweets. Tweet 1 = hook die de hele thread verkoopt. Elke tweet staat op zichzelf, < 280 tekens. Nummer ze (1/, 2/, …). Laatste tweet = CTA.",
  },
  {
    key: "youtube",
    label: "YouTube",
    emoji: "▶️",
    recipe: () =>
      "Geef: 5 klikbare YouTube-titels, een thumbnail-tekst (max 4 woorden), en een outline van een long-form video (intro-hook + 4-6 secties met bullets).",
  },
  {
    key: "email",
    label: "E-mail",
    emoji: "✉️",
    recipe: () =>
      "Schrijf een korte e-mail/nieuwsbrief: pakkende onderwerpregel, persoonlijke opening, één waardevol inzicht, en een duidelijke CTA. Conversationeel.",
  },
];

async function callAI(template: string, input: string, clientId: string, useBrain: boolean) {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, input, client_id: clientId, fast: true, use_brain: useBrain }),
    });
    const data = await res.json();
    if (!data.ok) return { text: "", error: data.error ?? "Er ging iets mis." };
    return { text: data.text as string };
  } catch {
    return { text: "", error: "Er ging iets mis bij het genereren." };
  }
}

export function BoostClient({ clients, saved }: { clients: ClientInfo[]; saved: SavedItem[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const client = clients.find((c) => c.id === clientId)?.name ?? "de klant";
  const [core, setCore] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(["reel", "carrousel", "linkedin"]));

  // Vanuit Boards "Boost" geklikt? Pak de meegegeven tekst op.
  useEffect(() => {
    try {
      const fromBoard = sessionStorage.getItem("boost:core");
      if (fromBoard) {
        setCore(fromBoard);
        sessionStorage.removeItem("boost:core");
      }
    } catch {
      /* geen storage — niets aan de hand */
    }
  }, []);
  const [useBrain, setUseBrain] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, { text?: string; error?: string; loading: boolean }>>({});

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function boost() {
    if (!core.trim() || picked.size === 0 || running) return;
    setRunning(true);
    const formats = FORMATS.filter((f) => picked.has(f.key));
    setResults(Object.fromEntries(formats.map((f) => [f.key, { loading: true }])));

    await Promise.all(
      formats.map(async (f) => {
        const template = `Je herschrijft één kern-idee naar een specifiek format voor de personal brand van ${client}. ${f.recipe(client)}\n\nKern-idee / bronmateriaal:\n${"{{onderwerp}}"}`;
        const r = await callAI(template, core.trim(), clientId, useBrain);
        setResults((prev) => ({ ...prev, [f.key]: { text: r.text, error: r.error, loading: false } }));
      })
    );
    setRunning(false);
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Input */}
      <Card className="lg:col-span-2 p-6 h-fit lg:sticky lg:top-24">
        <Eyebrow>Het idee</Eyebrow>
        <h2 className="font-display font-extrabold text-xl mb-5">Wat boosten we?</h2>

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Klant</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-card">{c.name} {c.handle ? `(${c.handle})` : ""}</option>
          ))}
        </select>

        {saved.length > 0 && (
          <>
            <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Of pak uit je second brain</label>
            <select
              defaultValue=""
              onChange={(e) => {
                const item = saved.find((s) => s.id === e.target.value);
                if (item) setCore(item.text);
              }}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40"
            >
              <option value="" className="bg-card">— kies een bewaard item —</option>
              {saved.map((s) => (
                <option key={s.id} value={s.id} className="bg-card">{s.label.slice(0, 60)}</option>
              ))}
            </select>
          </>
        )}

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Kern-idee</label>
        <textarea
          value={core}
          onChange={(e) => setCore(e.target.value)}
          rows={6}
          placeholder="Plak een winnende hook, een ruwe gedachte of een heel concept. Dit wordt de bron voor alle formats."
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-accent/40 resize-y leading-relaxed"
        />

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Formats</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] transition-all ${
                picked.has(f.key) ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-[12.5px] text-muted mb-4 cursor-pointer">
          <input type="checkbox" checked={useBrain} onChange={(e) => setUseBrain(e.target.checked)} className="accent-[#F97316]" />
          Second brain meenemen als context
        </label>

        <button
          onClick={boost}
          disabled={running || !core.trim() || picked.size === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-4 py-3 transition-colors"
        >
          {running ? (
            <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Boosten…</>
          ) : (
            <>{icons.rocket} Boost naar {picked.size} format{picked.size === 1 ? "" : "s"}</>
          )}
        </button>
      </Card>

      {/* Output */}
      <div className="lg:col-span-3 space-y-5">
        {Object.keys(results).length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-4">{icons.rocket}</span>
            <h3 className="font-display font-bold text-lg mb-1">Nog niks geboost</h3>
            <p className="text-muted text-sm max-w-sm mx-auto">
              Eén sterk idee links → een hele week aan content rechts. Kies je formats en druk op Boost.
            </p>
          </Card>
        ) : (
          FORMATS.filter((f) => results[f.key]).map((f) => {
            const r = results[f.key];
            return (
              <Card key={f.key} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-extrabold text-lg">{f.emoji} {f.label}</h2>
                  {r.text && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(r.text!)}
                      className="rounded-lg border border-white/[0.08] hover:border-accent/30 px-3 py-1.5 text-[12px] transition-all"
                    >
                      Kopieer
                    </button>
                  )}
                </div>
                {r.loading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-3 rounded bg-white/[0.05] animate-pulse" style={{ width: `${90 - i * 12}%` }} />
                    ))}
                  </div>
                ) : r.error ? (
                  <p className="text-sm text-red-400">{r.error}</p>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground/85 bg-black/30 rounded-xl p-5 border border-white/[0.05]">
                    {r.text}
                  </pre>
                )}
              </Card>
            );
          })
        )}
        {Object.keys(results).length > 0 && !running && (
          <p className="text-center text-[12px] text-muted">
            <Badge color="#34D399">{icons.check} Klaar</Badge> Eén idee, {Object.keys(results).length} formats — klaar om in te plannen.
          </p>
        )}
      </div>
    </div>
  );
}
