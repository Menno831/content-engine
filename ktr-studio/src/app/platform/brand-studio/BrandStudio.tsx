"use client";

// ════════════════════════════════════════════════════════════════
// Brand Studio v2 — carousels & stories in de huisstijl van de klant.
// Drop een foto als achtergrond, plak je tekst (lege regel = nieuwe
// slide), kleuren komen van het klantprofiel. Export als PNG's op
// volledige resolutie (1080x1350 carrousel / 1080x1920 story) via
// canvas — geen externe diensten nodig.
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Eyebrow, icons } from "../_components";

export interface BrandClient {
  id: string;
  name: string;
  handle: string;
  brandPrimary: string | null;
  brandSecondary: string | null;
}

type Format = "carrousel" | "story";

const DIMS: Record<Format, { w: number; h: number; label: string }> = {
  carrousel: { w: 1080, h: 1350, label: "Carrousel (4:5)" },
  story: { w: 1080, h: 1920, label: "Story (9:16)" },
};

const SAMPLE = `Iedereen post elke dag — en niemand groeit.

De waarheid: je hook is niet het probleem. Je eerste frame wel.

De eerste 3 seconden bepalen 90% van je bereik.

Wil je mijn frame-formule? Reageer met 'FRAME'.`;

// ── Canvas-helpers (gedeeld door preview + export) ──────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

interface SlideStyle {
  primary: string;
  secondary: string;
  handle: string;
  photo: HTMLImageElement | null;
  textPos: "onder" | "midden";
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  text: string,
  index: number,
  total: number,
  w: number,
  h: number,
  s: SlideStyle
) {
  // Achtergrond: foto (cover) of merk-gradient.
  if (s.photo) {
    drawCover(ctx, s.photo, w, h);
    // Donkere overlay zodat tekst altijd leesbaar is.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0.25)");
    g.addColorStop(0.5, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, s.secondary);
    g.addColorStop(1, "#060606");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Subtiele accent-gloed rechtsboven.
    const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.7);
    glow.addColorStop(0, `${s.primary}33`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  const pad = Math.round(w * 0.085);
  const isHook = index === 0;
  const fontSize = Math.round(w * (isHook ? 0.072 : 0.058));
  ctx.font = `800 ${fontSize}px Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const lines = wrapText(ctx, text, w - pad * 2);
  const lineH = Math.round(fontSize * 1.22);
  const blockH = lines.length * lineH;

  const baseY =
    s.textPos === "midden"
      ? (h - blockH) / 2 + fontSize
      : h - pad - blockH + fontSize - Math.round(h * 0.055);

  // Accent-balk boven de tekst.
  ctx.fillStyle = s.primary;
  ctx.fillRect(pad, baseY - fontSize - Math.round(lineH * 0.55), Math.round(w * 0.09), Math.round(w * 0.012));

  // Tekst met subtiele schaduw.
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#F5F0EB";
  lines.forEach((l, i) => ctx.fillText(l, pad, baseY + i * lineH));
  ctx.shadowBlur = 0;

  // Footer: handle links, paginanummer rechts.
  const footY = h - Math.round(h * 0.032);
  ctx.font = `600 ${Math.round(w * 0.026)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = "rgba(245,240,235,0.75)";
  if (s.handle) ctx.fillText(s.handle, pad, footY);
  if (total > 1) {
    const pageStr = `${index + 1}/${total}`;
    const pw = ctx.measureText(pageStr).width;
    ctx.fillStyle = s.primary;
    ctx.fillText(pageStr, w - pad - pw, footY);
  }
}

export function BrandStudio({ clients }: { clients: BrandClient[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const primary = client?.brandPrimary || "#F97316";
  const secondary = client?.brandSecondary || "#1A1208";

  const [format, setFormat] = useState<Format>("carrousel");
  const [text, setText] = useState(SAMPLE);
  const [textPos, setTextPos] = useState<"onder" | "midden">("onder");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const slides = useMemo(() => {
    const chunks = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    return chunks.length ? chunks : ["Plak je tekst links…"];
  }, [text]);

  const activeSlide = Math.min(active, slides.length - 1);
  const { w, h } = DIMS[format];

  function onPhoto(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      setPhotoName(file.name);
    };
    img.src = URL.createObjectURL(file);
  }

  // Live preview op halve resolutie (snel genoeg, scherp genoeg).
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = w / 2;
    canvas.height = h / 2;
    ctx.save();
    ctx.scale(0.5, 0.5);
    drawSlide(ctx, slides[activeSlide] ?? "", activeSlide, slides.length, w, h, {
      primary,
      secondary,
      handle: client?.handle ?? "",
      photo,
      textPos,
    });
    ctx.restore();
  }, [slides, activeSlide, w, h, primary, secondary, photo, textPos, client?.handle]);

  // Export: elke slide op volle resolutie -> PNG download.
  async function exportAll() {
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      for (let i = 0; i < slides.length; i++) {
        ctx.clearRect(0, 0, w, h);
        drawSlide(ctx, slides[i], i, slides.length, w, h, {
          primary,
          secondary,
          handle: client?.handle ?? "",
          photo,
          textPos,
        });
        const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
        if (!blob) continue;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${(client?.name ?? "slide").toLowerCase().replace(/\s+/g, "-")}-${format}-${i + 1}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        // Browser even ademruimte geven tussen downloads.
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Input */}
      <Card className="lg:col-span-2 p-6 h-fit lg:sticky lg:top-24">
        <Eyebrow>Ontwerp</Eyebrow>
        <h2 className="font-display font-extrabold text-xl mb-4">Tekst → merk-content</h2>

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-2">Klant (kleuren + handle)</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm mb-1 outline-none focus:border-accent/40"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 mb-4 text-[11px] text-muted">
          Kleuren:
          <span className="w-4 h-4 rounded border border-white/20" style={{ background: primary }} />
          <span className="w-4 h-4 rounded border border-white/20" style={{ background: secondary }} />
          <span>— in te stellen op het klantprofiel</span>
        </div>

        {/* Formaat + tekstpositie */}
        <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1 mb-3">
          {(Object.keys(DIMS) as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 rounded-lg py-1.5 text-[12.5px] transition-all ${format === f ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"}`}
            >
              {DIMS[f].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1 mb-4">
          {(["onder", "midden"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setTextPos(p)}
              className={`flex-1 rounded-lg py-1.5 text-[12.5px] capitalize transition-all ${textPos === p ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"}`}
            >
              Tekst {p}
            </button>
          ))}
        </div>

        {/* Foto-drop */}
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onPhoto(e.dataTransfer.files?.[0]);
          }}
          className="block rounded-xl border border-dashed border-white/[0.1] hover:border-accent/30 p-4 text-center cursor-pointer transition-all mb-2"
        >
          <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} className="hidden" />
          {photo ? (
            <span className="text-[12.5px] text-emerald-400">📷 {photoName} — klik om te vervangen</span>
          ) : (
            <span className="text-[12.5px] text-muted">Sleep een foto hierheen als achtergrond (optioneel — anders merk-gradient)</span>
          )}
        </label>
        {photo && (
          <button onClick={() => { setPhoto(null); setPhotoName(null); }} className="mb-3 text-[11px] text-muted hover:text-red-400">
            ✕ Foto verwijderen
          </button>
        )}

        <label className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5 mt-2">
          Tekst — lege regel = nieuwe slide
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 resize-y leading-relaxed mb-4"
        />

        <button
          onClick={exportAll}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm px-4 py-3 transition-colors"
        >
          {exporting ? (
            <><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Exporteren…</>
          ) : (
            <>{icons.arrowRight} Download {slides.length} PNG{slides.length === 1 ? "" : "'s"} ({w}×{h})</>
          )}
        </button>
      </Card>

      {/* Preview */}
      <div className="lg:col-span-3">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-lg">Preview</h2>
            <span className="text-[12px] text-muted">{slides.length} slide{slides.length === 1 ? "" : "s"} · {DIMS[format].label}</span>
          </div>

          <div className="flex justify-center mb-4">
            <canvas
              ref={previewRef}
              className="rounded-xl border border-white/[0.08] max-w-full h-auto"
              style={{ maxHeight: 560 }}
            />
          </div>

          {slides.length > 1 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  title={s.slice(0, 60)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] transition-all ${i === activeSlide ? "bg-accent text-background font-bold" : "border border-white/[0.08] text-muted hover:text-accent"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
