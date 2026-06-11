"use client";

// ════════════════════════════════════════════════════════════════
// Tekstveld met inspreek-knop. Gebruikt de browser Web Speech API
// (gratis, Nederlands) — gesproken tekst wordt achteraan toegevoegd,
// typen blijft gewoon werken. Geen ondersteuning (bv. Firefox)?
// Dan verdwijnt de knop en is het een normaal tekstveld.
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
function getRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function SpeechTextarea({
  name,
  defaultValue,
  rows = 3,
  placeholder,
  className,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* al gestopt */
      }
    };
  }, []);

  function append(text: string) {
    const ta = taRef.current;
    if (!ta || !text.trim()) return;
    const cur = ta.value.trimEnd();
    ta.value = cur ? `${cur} ${text.trim()}` : text.trim();
  }

  function toggle() {
    if (recording) {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      setRecording(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "nl-NL";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) append(e.results[i][0].transcript);
      }
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        className={`${className ?? ""} ${supported ? "pr-11" : ""}`}
      />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          title={recording ? "Stop opnemen" : "Spreek je antwoord in"}
          className={`absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-lg border transition-all ${
            recording
              ? "border-red-400/60 bg-red-400/15 text-red-400 animate-pulse"
              : "border-white/[0.1] text-muted hover:border-accent/40 hover:text-accent"
          }`}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
          </svg>
        </button>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
