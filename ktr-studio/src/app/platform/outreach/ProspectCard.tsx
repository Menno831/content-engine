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

function igHandle(v: string): string {
  return v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "").trim();
}

function ytUrl(v: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, "").trim();
  return /^UC[\w-]{21,22}$/.test(h) ? `https://youtube.com/channel/${h}` : `https://youtube.com/@${h}`;
}

export function ProspectCard({ prospect: p, demo }: { prospect: Prospect; demo: boolean }) {
  const [copied, setCopied] = useState(false);
  const [showMsg, setShowMsg] = useState(false);

  const handle = p.instagram ? igHandle(p.instagram) : null;

  async function copyMessage() {
    if (!p.message) return;
    try {
      await navigator.clipboard.writeText(p.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowMsg(true);
    }
  }

  return (
    <Card hover className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar initials={p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{p.name}</div>
          <div className="text-[11px] text-muted truncate">{p.instagram ?? p.youtube ?? "—"}</div>
        </div>
        <span className="font-mono text-[12px] text-emerald-400">{fmtEur(p.potentialValue)}</span>
      </div>

      {/* Kanalen checken: één klik naar het profiel */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
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

      {p.weakness && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 mb-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">Waarom fit</div>
          <div className="text-[12px] text-foreground/80">{p.weakness}</div>
        </div>
      )}

      {/* DM-bericht: kopiëren + direct de DM openen */}
      {p.message && (
        <div className="mb-2">
          <div className="flex gap-1.5">
            <button
              onClick={copyMessage}
              className="flex-1 rounded-lg bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent font-bold text-[11.5px] py-1.5 transition-colors"
            >
              {copied ? "Gekopieerd ✓" : "📋 Kopieer bericht"}
            </button>
            {handle && (
              <a
                href={`https://ig.me/m/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-accent hover:bg-accent-hover text-background font-bold text-[11.5px] py-1.5 text-center transition-colors"
              >
                ✉ Open DM
              </a>
            )}
          </div>
          <button onClick={() => setShowMsg((s) => !s)} className="mt-1 text-[11px] text-muted hover:text-foreground transition-colors">
            {showMsg ? "▾ Verberg bericht" : "▸ Bekijk bericht"}
          </button>
          {showMsg && (
            <p className="mt-1 rounded-lg bg-black/30 border border-white/[0.06] px-2.5 py-2 text-[12px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
              {p.message}
            </p>
          )}
        </div>
      )}

      {p.note && <div className="text-[11px] text-muted">{p.note}</div>}
      {!demo && <ProspectStageControl prospectId={p.id} stage={p.stage} />}
    </Card>
  );
}
