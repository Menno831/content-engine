"use client";

import { icons } from "./_components";

type Row = Record<string, string | number | null | undefined>;

export function ExportButton({ rows, filename, label = "Exporteer CSV" }: { rows: Row[]; filename: string; label?: string }) {
  function download() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      disabled={!rows.length}
      className="flex items-center gap-2 rounded-xl border border-white/[0.08] hover:border-accent/30 hover:text-accent disabled:opacity-40 px-4 py-2.5 text-sm transition-all"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      {label}
    </button>
  );
}
