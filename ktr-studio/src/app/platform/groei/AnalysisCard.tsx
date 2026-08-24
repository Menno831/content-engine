"use client";

// De AI-weekanalyse: automatisch elke maandag, of handmatig verversen.

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { refreshAnalysisAction } from "./actions";

export function AnalysisCard({ note, date }: { note: string | null; date: string | null }) {
  const [current, setCurrent] = useState(note);
  const [currentDate, setCurrentDate] = useState(date);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function refresh() {
    start(async () => {
      const r = await refreshAnalysisAction();
      if (r.error) setError(r.error);
      else {
        setError("");
        setCurrent(r.note ?? current);
        setCurrentDate("zojuist");
      }
    });
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Eyebrow>AI-weekanalyse</Eyebrow>
          <h2 className="font-display font-extrabold text-xl">Wat de cijfers zeggen</h2>
        </div>
        <button
          onClick={refresh}
          disabled={pending}
          className="shrink-0 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-2 text-[13px] text-muted transition-all disabled:opacity-50"
        >
          {pending ? "Analyseren…" : "↻ Ververs analyse"}
        </button>
      </div>

      {current ? (
        <>
          <p className="text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{current}</p>
          {currentDate && <p className="mt-3 text-[11.5px] text-muted">Geschreven {currentDate} — automatisch elke maandagochtend ververst.</p>}
        </>
      ) : (
        <p className="text-[13px] text-muted">
          Nog geen analyse. Klik op &ldquo;Ververs analyse&rdquo; voor de eerste — daarna schrijft de AI er elke
          maandagochtend automatisch één.
        </p>
      )}
      {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
    </Card>
  );
}
