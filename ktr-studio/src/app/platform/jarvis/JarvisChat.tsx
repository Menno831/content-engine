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
import { JarvisOrb, type OrbMode } from "./JarvisOrb";

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

// Standaard de meest "Jarvis-achtige" stem: een Nederlandse mannenstem
// (Xander op macOS, anders Google Nederlands), iets verlaagd van toon.
function defaultVoiceName(voices: SpeechSynthesisVoice[]): string | null {
  const nl = voices.filter((v) => v.lang.startsWith("nl"));
  const male = nl.find((v) => /xander|claes|frank|maarten/i.test(v.name));
  return (male ?? nl.find((v) => /google/i.test(v.name)) ?? nl[0])?.name ?? null;
}

// Arc-reactor-opstartgeluid: een originele synth-sweep via WebAudio —
// geen sample, geen bestaand deuntje, gewoon een power-up.
function playBootSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.18, t0 + 0.25);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    master.connect(ctx.destination);

    const sweep = ctx.createOscillator();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(70, t0);
    sweep.frequency.exponentialRampToValueAtTime(880, t0 + 1.1);
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 0.5;
    sweep.connect(sweepGain).connect(master);
    sweep.start(t0);
    sweep.stop(t0 + 1.2);

    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(1760, t0 + 0.9);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, t0 + 0.9);
    shimmerGain.gain.exponentialRampToValueAtTime(0.12, t0 + 1.05);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.55);
    shimmer.connect(shimmerGain).connect(master);
    shimmer.start(t0 + 0.9);
    shimmer.stop(t0 + 1.6);

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // geluid is nice-to-have — nooit blokkeren
  }
}

export function JarvisChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>("");
  const [showMusic, setShowMusic] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bootedRef = useRef(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMicAvailable(getRecognition() != null);
    // Stemmenlijst laadt async — bijwerken zodra hij er is.
    const load = () => {
      const all = window.speechSynthesis?.getVoices() ?? [];
      const usable = all.filter((v) => v.lang.startsWith("nl") || v.lang.startsWith("en"));
      setVoices(usable);
      setVoiceName((cur) => {
        if (cur) return cur;
        const saved = localStorage.getItem("jarvis-stem");
        if (saved && usable.some((v) => v.name === saved)) return saved;
        return defaultVoiceName(usable) ?? "";
      });
    };
    load();
    window.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
  }, []);

  // Eén keer per sessie het opstartgeluid, bij de eerste interactie
  // (browsers blokkeren geluid vóór een klik).
  function bootOnce() {
    if (bootedRef.current) return;
    bootedRef.current = true;
    playBootSound();
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function speak(text: string) {
    if (!speakEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "nl-NL";
    const voice = voices.find((v) => v.name === voiceName) ?? null;
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 1.0;
    u.pitch = 0.85; // iets lager: het butler-register
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    bootOnce();
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
    bootOnce();
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
    bootOnce();
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
      {showMusic && (
        <div className="mb-4 rounded-2xl overflow-hidden border border-white/[0.08]">
          {/* Officiële YouTube-speler — zo blijft het legaal en simpel. */}
          <iframe
            width="100%"
            height="200"
            src="https://www.youtube.com/embed/qRcYjJQ0JHg?autoplay=1"
            title="Iron Man — Black Sabbath (YouTube)"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="block"
          />
        </div>
      )}

      {/* Hij leeft: de bol volgt wat Jarvis doet */}
      <Card className="mb-4 overflow-hidden">
        <JarvisOrb mode={(listening ? "listening" : pending ? "thinking" : speaking ? "speaking" : "idle") as OrbMode} />
      </Card>

      {/* Gesprek */}
      <Card className="p-4 mb-4 max-h-[46vh] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-[13px] text-muted text-center py-6 max-w-sm mx-auto">
            Zeg of typ iets — of klik <strong className="text-foreground">Brief me</strong> voor je ochtendbriefing.
            Vraag bijvoorbeeld: &ldquo;wat moet ik vandaag doen&rdquo; of &ldquo;hoe sta ik ervoor deze maand&rdquo;.
          </p>
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
                {/* De AI schrijft soms markdown-sterretjes; als platte tekst
                    tonen we die zonder de ** eromheen. */}
                {m.content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s/gm, "")}
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

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={briefMe}
            disabled={pending}
            className="rounded-xl border border-accent/25 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-[13px] px-4 py-2 transition-colors disabled:opacity-50"
          >
            ☀️ Brief me
          </button>
          <button
            onClick={() => {
              bootOnce();
              setShowMusic((m) => !m);
            }}
            title="Iron Man — Black Sabbath"
            className={`rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
              showMusic
                ? "bg-accent text-background"
                : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
            }`}
          >
            🎵 Iron Man
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            Stem
            <select
              value={voiceName}
              onChange={(e) => {
                setVoiceName(e.target.value);
                localStorage.setItem("jarvis-stem", e.target.value);
                // Meteen even horen hoe hij klinkt.
                setTimeout(() => {
                  const u = new SpeechSynthesisUtterance("Tot uw dienst, meneer Kater.");
                  const v = window.speechSynthesis.getVoices().find((x) => x.name === e.target.value);
                  if (v) {
                    u.voice = v;
                    u.lang = v.lang;
                  }
                  u.pitch = 0.85;
                  window.speechSynthesis.cancel();
                  window.speechSynthesis.speak(u);
                }, 50);
              }}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-[12px] outline-none focus:border-accent/40 max-w-[160px]"
            >
              {voices.length === 0 && <option value="" className="bg-card">standaard</option>}
              {voices.map((v) => (
                <option key={v.name} value={v.name} className="bg-card">
                  {v.name.replace(/^(Microsoft|Google)\s*/i, "")} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={speakEnabled}
              onChange={(e) => {
                setSpeakEnabled(e.target.checked);
                if (!e.target.checked) {
                  window.speechSynthesis?.cancel();
                  setSpeaking(false);
                }
              }}
              className="accent-[var(--accent)] w-4 h-4"
            />
            Voorlezen
          </label>
        </div>
      </div>
    </div>
  );
}
