"use client";

// ════════════════════════════════════════════════════════════════
// Eén prospect-kaart op het outreachboard: kanaal-links (IG/YouTube),
// het kant-en-klare DM-bericht met kopieerknop, en een "Open DM"-knop
// die direct de Instagram-DM opent. Versturen blijft handmatig.
// ════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Card, Avatar } from "../_components";
import { fmtEur, type Prospect } from "../_data";
import { ProspectStageControl } from "./ProspectStageControl";
import { generateProspectDmAction, setProspectTierAction, updateProspectStageAction } from "./actions";

export function igHandle(v: string): string {
  const h = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "").trim();
  if (/^[\w.]+$/.test(h)) return h;
  // Handle met annotatie eromheen ("@naam (~108K)" of twee handles met +):
  // pak de eerste @handle uit de tekst. Vrije tekst zonder @ blijft verborgen.
  const m = v.match(/@([\w.]{2,30})/);
  return m ? m[1] : "";
}

function ytUrl(v: string): string {
  const t = v.trim();
  // Volledige URL zonder ruis → direct gebruiken.
  if (/^https?:\/\//i.test(t) && !/\s/.test(t)) return t;
  // Zit er ergens een youtube.com/-verwijzing in (ook zonder protocol,
  // ook met ruis eromheen)? Dan die als directe kanaallink pakken.
  const m = t.match(/(?:www\.)?youtube\.com\/(@[\w.\-]+|channel\/UC[\w-]{21,22}|c\/[\w.\-]+)/i);
  if (m) return `https://www.youtube.com/${m[1]}`;
  const h = t.replace(/^@/, "");
  if (/^UC[\w-]{21,22}$/.test(h)) return `https://youtube.com/channel/${h}`;
  // Kale handle → kanaal-link; vrije tekst → zoeklink (werkt altijd).
  if (/^[\w.\-]+$/.test(h)) return `https://youtube.com/@${h}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(t.replace(/\s*YouTube\s*$/i, ""))}`;
}

export function ProspectCard({ prospect: p, demo }: { prospect: Prospect; demo: boolean }) {
  const [copied, setCopied] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dmOpened, setDmOpened] = useState(false);
  const [marked, setMarked] = useState(false);
  const [genError, setGenError] = useState("");
  const [message, setMessage] = useState(p.message);
  const [tier, setTier] = useState(p.tier ?? null);

  async function toggleTier(e: React.MouseEvent) {
    e.stopPropagation();
    const next = tier === "top" ? null : "top";
    setTier(next); // direct zichtbaar; server volgt
    const r = await setProspectTierAction(p.id, next as "top" | null);
    if (r.error) setTier(tier); // terugdraaien bij fout
  }

  async function writeDm() {
    setGenerating(true);
    setGenError("");
    const r = await generateProspectDmAction(p.id);
    setGenerating(false);
    if (r.error) setGenError(r.error);
    else if (r.message) {
      setMessage(r.message);
      setShowMsg(true);
    }
  }

  const handle = p.instagram ? igHandle(p.instagram) : null;

  // Eén klik: DM-venster open + bericht op het klembord. Daarna alleen
  // nog plakken, lezen en versturen — en terug hier op ✓ drukken.
  function openDmWithMessage() {
    if (handle) window.open(`https://ig.me/m/${handle}`, "_blank", "noopener");
    if (message) {
      navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }).catch(() => setShowMsg(true));
    }
    setDmOpened(true);
    setShowMsg(true);
  }

  async function markSent() {
    setMarked(true);
    await updateProspectStageAction(p.id, "dm_verstuurd");
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowMsg(true);
    }
  }

  return (
    <Card hover className={`p-3.5 ${tier === "top" ? "border-amber-400/35" : ""}`}>
      {/* Ingeklapt: naam, waarde en de kanaal-links — meer niet. */}
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()} size={30} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{p.name}</div>
          </div>
          {!demo && (
            <span
              role="button"
              onClick={toggleTier}
              title={tier === "top" ? "Uit de toplaag halen" : "Naar de toplaag (persoonlijke aanpak)"}
              className={`shrink-0 text-[15px] leading-none transition-colors ${
                tier === "top" ? "text-amber-300" : "text-muted/40 hover:text-amber-300"
              }`}
            >
              {tier === "top" ? "★" : "☆"}
            </span>
          )}
          <span className="font-mono text-[12px] text-emerald-400 shrink-0">{fmtEur(p.potentialValue)}</span>
          <span className="text-[11px] text-muted shrink-0">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {handle && (
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/[0.08] hover:border-accent/40 hover:text-accent px-2 py-1 text-[11px] text-foreground/80 transition-all"
          >
            ↗ Instagram
          </a>
        )}
        {p.youtube && (
          <a
            href={ytUrl(p.youtube)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/[0.08] hover:border-accent/40 hover:text-accent px-2 py-1 text-[11px] text-foreground/80 transition-all"
          >
            ↗ YouTube
          </a>
        )}
      </div>

      {/* Reply binnen? Altijd tonen, ook ingeklapt — dit vraagt actie. */}
      {p.lastReply && (
        <div className="mt-2 rounded-lg border border-sky-400/25 bg-sky-400/[0.06] px-2.5 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300 mb-0.5">
            💬 Reply{p.lastReplyAt ? ` · ${new Date(p.lastReplyAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}` : ""}
          </div>
          <p className="text-[12px] text-foreground/85 whitespace-pre-wrap">{p.lastReply}</p>
          {p.replyDraft && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">Conceptantwoord</div>
              <p className="text-[12px] text-foreground/85 whitespace-pre-wrap">{p.replyDraft}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(p.replyDraft!);
                  if (handle) window.open(`https://ig.me/m/${handle}`, "_blank", "noopener");
                }}
                className="mt-1.5 w-full rounded-lg bg-sky-400/15 border border-sky-400/30 hover:bg-sky-400/25 text-sky-200 font-bold text-[11.5px] py-1.5 transition-colors"
              >
                ✉ Open DM + kopieer antwoord
              </button>
            </div>
          )}
        </div>
      )}

      {!open ? null : (
      <div className="mt-2.5">
      {tier === "top" && (
        <div className="rounded-lg bg-amber-400/[0.07] border border-amber-400/20 px-2.5 py-2 mb-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 mb-0.5">★ Toplaag</div>
          <div className="text-[11.5px] text-foreground/80 leading-relaxed">
            Persoonlijke aanpak: bekijk eerst echt hun kanaal. Opener mag uit het veld hieronder,
            maar zodra er antwoord komt schakel je naar voice notes en noem je de 12K→80K-case.
            Interesse? Zelfde dag call boeken.
          </div>
        </div>
      )}
      {p.weakness && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 mb-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">Waarom fit</div>
          <div className="text-[12px] text-foreground/80">{p.weakness}</div>
        </div>
      )}

      {/* Nog geen bericht: laat de AI een concept schrijven in Menno's stem */}
      {!message && !demo && (
        <div className="mb-2">
          <button
            onClick={writeDm}
            disabled={generating}
            className="w-full rounded-lg border border-accent/25 bg-accent/10 hover:bg-accent/20 disabled:opacity-60 text-accent font-bold text-[11.5px] py-1.5 transition-colors"
          >
            {generating ? "Schrijven…" : "✨ Schrijf concept-DM"}
          </button>
          {genError && <p className="mt-1 text-[11px] text-red-400">{genError}</p>}
        </div>
      )}

      {/* DM-bericht: kopiëren + direct de DM openen */}
      {message && (
        <div className="mb-2">
          <div className="flex gap-1.5">
            {handle ? (
              <button
                onClick={openDmWithMessage}
                className="flex-1 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-[11.5px] py-1.5 transition-colors"
              >
                {copied ? "✓ Gekopieerd — plak in IG (⌘V)" : "✉ Open DM + kopieer bericht"}
              </button>
            ) : (
              <button
                onClick={copyMessage}
                className="flex-1 rounded-lg bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent font-bold text-[11.5px] py-1.5 transition-colors"
              >
                {copied ? "Gekopieerd ✓" : "📋 Kopieer bericht"}
              </button>
            )}
            {dmOpened && !marked && (
              <button
                onClick={markSent}
                className="flex-1 rounded-lg border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 font-bold text-[11.5px] py-1.5 transition-colors"
              >
                ✓ Verstuurd
              </button>
            )}
            {marked && (
              <span className="flex-1 grid place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 font-bold text-[11.5px] py-1.5">
                Verstuurd ✓ geteld
              </span>
            )}
          </div>
          <button onClick={() => setShowMsg((s) => !s)} className="mt-1 text-[11px] text-muted hover:text-foreground transition-colors">
            {showMsg ? "▾ Verberg bericht" : "▸ Bekijk bericht"}
          </button>
          {showMsg && (
            <p className="mt-1 rounded-lg bg-black/30 border border-white/[0.06] px-2.5 py-2 text-[12px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          )}
        </div>
      )}

      {p.note && <div className="text-[11px] text-muted">{p.note}</div>}
      {p.fitReason && (
        <div className={`text-[11px] ${p.stage === "afgekeurd" ? "text-red-400/90" : p.fitReason.startsWith("high-ticket") ? "text-emerald-400/90" : "text-amber-300/90"}`}>
          🧭 {p.fitReason}
        </div>
      )}
      {!demo && <ProspectStageControl prospectId={p.id} stage={p.stage} />}
      </div>
      )}
    </Card>
  );
}
