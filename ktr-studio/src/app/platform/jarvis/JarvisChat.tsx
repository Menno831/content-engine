"use client";

// ════════════════════════════════════════════════════════════════
// Jarvis: praten of typen, hij praat terug.
// - Microfoon via de Web Speech API (nl-NL) — werkt in Chrome/Edge,
//   geen externe dienst of key nodig.
// - Voorlezen via speechSynthesis met een Nederlandse stem.
// - "Brief me" haalt de ochtendbriefing op en leest 'm voor.
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useTransition } from "react";
import { Card } from "../_components";
import { askJarvisAction, getBriefingAction } from "./actions";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// Minimale typedeclaratie voor webkitSpeechRecognition.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "nl-NL";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

function pickDutchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.startsWith("nl") && /google|natural|premium/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("nl")) ?? null;
}

export function JarvisChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMicAvailable(getRecognition() != null);
    // Stemmenlijst laadt async — alvast opwarmen.
    window.speechSynthesis?.getVoices();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function speak(text: string) {
    if (!speakEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "nl-NL";
    const voice = pickDutchVoice();
    if (voice) u.voice = voice;
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setInput("");
    setError("");
    setMessages((cur) => [...cur, { role: "user", content: q }]);
    start(async () => {
      const r = await askJarvisAction(q);
      if (r.error) {
        setError(r.error);
        speak(r.error);
      } else if (r.reply) {
        setMessages((cur) => [...cur, { role: "assistant", content: r.reply! }]);
        speak(r.reply);
      }
    });
  }

  function briefMe() {
    if (pending) return;
    setError("");
    setMessages((cur) => [...cur, { role: "user", content: "Brief me" }]);
    start(async () => {
      const r = await getBriefingAction();
      if (r.error) setError(r.error);
      else if (r.reply) {
        setMessages((cur) => [...cur, { role: "assistant", content: r.reply! }]);
        speak(r.reply);
      }
    });
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      setError("Spraak werkt alleen in Chrome of Edge.");
      return;
    }
    recRef.current = rec;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      if (transcript.trim()) send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") setError("Microfoon geweigerd — sta 'm toe in je browser.");
    };
    setListening(true);
    rec.start();
  }

  return (
    <div className="max-w-3xl">
      {/* Gesprek */}
      <Card className="p-4 mb-4 min-h-[380px] max-h-[58vh] overflow-y-auto">
        {messages.length === 0 && (
          <div className="grid place-items-center h-[340px] text-center">
            <div>
              <div className="text-4xl mb-3">🎙</div>
              <p className="text-sm text-muted max-w-sm">
                Zeg of typ iets — of klik <strong className="text-foreground">Brief me</strong> voor je
                ochtendbriefing. Vraag bijvoorbeeld: &ldquo;wat moet ik vandaag doen&rdquo; of &ldquo;hoe sta ik
                ervoor deze maand&rdquo;.
              </p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-accent text-background font-medium rounded-br-md"
                    : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 text-[14px] text-muted">
                Jarvis denkt na…
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </Card>

      {error && <p className="mb-3 text-[13px] text-amber-300">{error}</p>}

      {/* Invoer */}
      <div className="flex gap-2">
        <button
          onClick={toggleMic}
          disabled={!micAvailable}
          title={micAvailable ? "Praat tegen Jarvis" : "Spraak werkt alleen in Chrome/Edge"}
          className={`shrink-0 w-12 h-12 rounded-xl grid place-items-center text-lg transition-all ${
            listening
              ? "bg-red-500/20 border border-red-500/50 animate-pulse"
              : "border border-white/[0.08] hover:border-accent/40 disabled:opacity-40"
          }`}
        >
          {listening ? "⏹" : "🎙"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={listening ? "Luistert…" : "Typ of praat…"}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm outline-none focus:border-accent/40"
        />
        <button
          onClick={() => send(input)}
          disabled={pending || !input.trim()}
          className="shrink-0 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-5 transition-colors"
        >
          Stuur
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={briefMe}
          disabled={pending}
          className="rounded-xl border border-accent/25 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-[13px] px-4 py-2 transition-colors disabled:opacity-50"
        >
          ☀️ Brief me
        </button>
        <label className="flex items-center gap-2 text-[12.5px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={speakEnabled}
            onChange={(e) => {
              setSpeakEnabled(e.target.checked);
              if (!e.target.checked) window.speechSynthesis?.cancel();
            }}
            className="accent-[var(--accent)] w-4 h-4"
          />
          Lees antwoorden voor
        </label>
      </div>
    </div>
  );
}
