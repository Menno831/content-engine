"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  addTranscriptAction,
  deleteTranscriptAction,
  regenerateBrandDocsAction,
  type ActionResult,
} from "./actions";
import { Card, icons } from "../_components";
import type { TranscriptMeta } from "@/lib/data";

const initial: ActionResult = {};

/**
 * Transcripten als brand voice-bron: plak of upload de tekst uit
 * Transkriptor (podcasts, calls, ruwe footage). Meerdere sprekers is
 * prima — de AI filtert de klant eruit bij het genereren.
 */
export function TranscriptsCard({ clientId, transcripts }: { clientId: string; transcripts: TranscriptMeta[] }) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState(addTranscriptAction, initial);
  const [genPending, startTransition] = useTransition();
  const [genMsg, setGenMsg] = useState<ActionResult>({});
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (contentRef.current) contentRef.current.value = String(reader.result ?? "");
      if (titleRef.current && !titleRef.current.value) titleRef.current.value = file.name.replace(/\.(txt|srt|vtt|md)$/i, "");
    };
    reader.readAsText(file);
  }

  function regenerate() {
    setGenMsg({});
    startTransition(async () => {
      const res = await regenerateBrandDocsAction(clientId);
      setGenMsg(res);
    });
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-display font-extrabold text-xl">Transcripten</h2>
        <div className="flex items-center gap-2">
          {transcripts.length > 0 && (
            <button
              type="button"
              onClick={regenerate}
              disabled={genPending}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-50 px-3 py-1.5 text-[12px] transition-all"
            >
              {genPending ? (
                <span className="w-3 h-3 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
              ) : (
                icons.spark
              )}
              Genereer brand voice
            </button>
          )}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold px-3 py-1.5 text-[12px] transition-colors"
          >
            {icons.plus} {adding ? "Sluiten" : "Transcript toevoegen"}
          </button>
        </div>
      </div>
      <p className="text-muted text-sm">
        Ruwe spraak is de beste voice-bron. Exporteer transcripten uit <strong>Transkriptor</strong> (podcasts,
        calls, footage) en plak ze hier. Meerdere sprekers? Geen probleem — de AI haalt alleen de klant eruit.
      </p>
      {state.ok && <p className="mt-2 text-[13px] text-emerald-400">{state.ok}</p>}
      {state.error && <p className="mt-2 text-[13px] text-red-400">{state.error}</p>}
      {genMsg.ok && <p className="mt-2 text-[13px] text-emerald-400">{genMsg.ok}</p>}
      {genMsg.error && <p className="mt-2 text-[13px] text-red-400">{genMsg.error}</p>}

      {adding && (
        <form action={action} className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <input type="hidden" name="client_id" value={clientId} />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={titleRef}
              name="title"
              placeholder="Titel — bijv. 'Podcast over schaalbaarheid'"
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
            />
            <label className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/30 px-3 py-2 text-[12px] cursor-pointer transition-all">
              Bestand (.txt/.srt/.vtt)
              <input type="file" accept=".txt,.srt,.vtt,.md,text/plain" onChange={onFile} className="hidden" />
            </label>
          </div>
          <textarea
            ref={contentRef}
            name="content"
            rows={6}
            placeholder="Plak hier het volledige transcript… (sprekerlabels zoals 'Spreker 1:' mogen blijven staan)"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40 resize-y font-mono text-[12.5px] leading-relaxed"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-2 transition-colors"
          >
            {pending ? "Opslaan…" : "Transcript opslaan"}
          </button>
        </form>
      )}

      {transcripts.length > 0 && (
        <div className="mt-4 space-y-2">
          {transcripts.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.01] px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{t.title}</div>
                <div className="text-[11px] text-muted">
                  {t.chars.toLocaleString("nl-NL")} tekens
                  {t.createdAt && ` · ${new Date(t.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Transcript "${t.title}" verwijderen?`)) {
                    startTransition(() => {
                      deleteTranscriptAction(t.id, clientId);
                    });
                  }
                }}
                className="rounded-lg border border-white/[0.08] hover:border-red-400/40 hover:text-red-400 px-2 py-1 text-[12px] transition-all shrink-0"
                title="Verwijderen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
