"use client";

import { useMemo, useState } from "react";
import { Card, Badge, icons } from "../_components";
import type { PromptTemplate } from "../_data";

const catColor: Record<string, string> = {
  Strategie: "#F97316",
  Content: "#34D399",
  Ideatie: "#A78BFA",
  Social: "#60A5FA",
};

export function PromptsLab({ templates }: { templates: PromptTemplate[] }) {
  const [active, setActive] = useState<PromptTemplate | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, PromptTemplate[]>();
    for (const t of templates) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()];
  }, [templates]);

  function open(t: PromptTemplate) {
    setActive(t);
    setInput("");
    setOutput(null);
  }

  async function run() {
    if (!active) return;
    setLoading(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: active.prompt, input }),
      });
      const data = await res.json();
      setOutput(data.ok ? data.text : data.error ?? "Er ging iets mis.");
    } catch {
      setOutput("Er ging iets mis bij het genereren.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-[12px] text-muted mb-5">
        Sla herbruikbare prompts op en draai ze met je eigen input. Mock-output · koppel Claude om echt te genereren.
      </p>

      <div className="space-y-8">
        {categories.map(([cat, items]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: catColor[cat] }} />
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted">{cat}</h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((t) => (
                <Card key={t.id} hover className="p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ background: `${catColor[t.category]}1A`, color: catColor[t.category] }}>
                      {icons.spark}
                    </span>
                    <Badge color={catColor[t.category]}>{t.category}</Badge>
                  </div>
                  <h3 className="font-medium text-sm mb-1">{t.name}</h3>
                  <p className="text-[12px] text-muted leading-relaxed flex-1">{t.description}</p>
                  <button
                    onClick={() => open(t)}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent py-2 text-[13px] transition-all"
                  >
                    Gebruik prompt {icons.arrowRight}
                  </button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Run-drawer */}
      {active && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="w-full max-w-lg h-full bg-card border-l border-white/[0.08] p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge color={catColor[active.category]}>{active.category}</Badge>
                <h3 className="font-display font-extrabold text-xl mt-2">{active.name}</h3>
              </div>
              <button onClick={() => setActive(null)} className="text-muted hover:text-foreground text-xl leading-none">×</button>
            </div>

            <p className="text-muted text-sm mb-4">{active.description}</p>

            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3 mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">Prompt-template</div>
              <p className="text-[12.5px] text-foreground/80 leading-relaxed">{active.prompt}</p>
            </div>

            <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">Jouw input ({"{{onderwerp}}"})</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="Bijv. 'waarom consistent posten niet werkt'"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-none mb-4"
            />

            <button
              onClick={run}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-3 transition-colors"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Genereren…
                </>
              ) : (
                <>{icons.spark} Draai prompt</>
              )}
            </button>

            {output && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-display font-bold text-sm">Output</h4>
                  <button className="text-[12px] text-accent hover:text-accent-hover">Kopieer</button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground/85 bg-black/30 rounded-xl p-4 border border-white/[0.05]">{output}</pre>
                <p className="mt-2 text-[11px] text-muted">Voorbeeldoutput · koppel Claude API voor echte generatie.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
