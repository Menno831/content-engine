"use client";

// ════════════════════════════════════════════════════════════════
// Daily Brief: vandaag's ideeën gegroepeerd per klant. Per idee kun
// je 'm boosten (door naar Boost met de hook als input) of verbergen.
// "Genereer nu" forceert een verse brief (handig voor de eerste keer).
// ════════════════════════════════════════════════════════════════
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, icons } from "../_components";
import { generateBriefNowAction, hideBriefIdeaAction, type BriefResult } from "./actions";
import type { BriefIdeaRow } from "@/lib/data";

export function BriefBoard({ ideas }: { ideas: BriefIdeaRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<BriefResult>({});

  // Groeperen per klant.
  const byClient: { id: string; name: string; items: BriefIdeaRow[] }[] = [];
  for (const idea of ideas) {
    let g = byClient.find((x) => x.id === idea.clientId);
    if (!g) {
      g = { id: idea.clientId, name: idea.clientName, items: [] };
      byClient.push(g);
    }
    g.items.push(idea);
  }

  function boost(idea: BriefIdeaRow) {
    const core = [idea.hook, idea.angle ? `Invalshoek: ${idea.angle}` : "", idea.title].filter(Boolean).join("\n");
    try {
      sessionStorage.setItem("boost:core", core);
    } catch {
      /* private mode */
    }
    router.push("/platform/boost");
  }

  function generateNow() {
    setMsg({});
    start(async () => {
      const r = await generateBriefNowAction();
      setMsg(r);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="text-sm text-muted">
          {ideas.length > 0 ? `${ideas.length} ideeën · ${byClient.length} klant(en)` : "Nog geen brief voor vandaag."}
        </div>
        <button
          onClick={generateNow}
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2.5 transition-colors"
        >
          {pending ? (
            <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Genereren…</>
          ) : (
            <>{icons.spark} Genereer nu</>
          )}
        </button>
      </div>
      {msg.ok && <p className="mb-4 text-[13px] text-emerald-400">{msg.ok}</p>}
      {msg.error && <p className="mb-4 text-[13px] text-red-400">{msg.error}</p>}

      {ideas.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-4">{icons.spark}</span>
          <h3 className="font-display font-bold text-lg mb-1">Nog geen ideeën voor vandaag</h3>
          <p className="text-muted text-sm max-w-md mx-auto">
            De brief draait automatisch elke ochtend. Wil je nu al ideeën? Klik op &ldquo;Genereer nu&rdquo; — wij bouwen
            per klant 3 scherpe ideeën op basis van hun brand voice, strategie en wat er nu werkt in de niche.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {byClient.map((g) => (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-px w-5 bg-accent/60" />
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">{g.name}</span>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {g.items.map((idea) => (
                  <Card key={idea.id} className="p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-sm leading-snug">{idea.title}</h3>
                      <button
                        onClick={() => start(async () => { await hideBriefIdeaAction(idea.id); })}
                        className="shrink-0 text-muted hover:text-red-400 text-[12px]"
                        title="Verbergen"
                      >
                        ✕
                      </button>
                    </div>
                    {idea.angle && <p className="text-[12px] text-muted mb-2">{idea.angle}</p>}
                    {idea.hook && (
                      <p className="text-[13px] text-foreground/90 leading-snug mb-2">&ldquo;{idea.hook}&rdquo;</p>
                    )}
                    {idea.why && (
                      <p className="text-[11.5px] text-muted leading-snug mb-4 flex items-start gap-1.5">
                        <span className="text-accent shrink-0">{icons.spark}</span> {idea.why}
                      </p>
                    )}
                    <button
                      onClick={() => boost(idea)}
                      className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-accent/10 hover:bg-accent hover:text-background text-accent font-bold text-[13px] px-4 py-2 transition-all"
                    >
                      {icons.rocket} Boost dit idee
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
