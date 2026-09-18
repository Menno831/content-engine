"use client";

// Alles aan- of uitvinken in één klik. Krijgt de ids mee die het moet
// raken, dus dezelfde knop werkt voor één fase-rij én voor het hele
// board — en hij respecteert altijd de actieve filters, want de server
// geeft alleen de zichtbare kaarten door.

import { useSyncExternalStore } from "react";
import { selection } from "./selection";

export function SelectAll({
  ids,
  label = "Alles",
  className = "",
}: {
  ids: string[];
  label?: string;
  className?: string;
}) {
  const all = useSyncExternalStore(
    selection.subscribe,
    () => selection.hasAll(ids),
    () => false
  );

  if (ids.length === 0) return null;

  return (
    <button
      onClick={() => (all ? selection.removeMany(ids) : selection.addMany(ids))}
      className={`rounded-lg border px-2.5 py-1 text-[11.5px] transition-all ${
        all
          ? "border-accent/40 bg-accent/[0.08] text-accent"
          : "border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
      } ${className}`}
      title={all ? "Selectie opheffen" : `${ids.length} ${ids.length === 1 ? "kaart" : "kaarten"} selecteren`}
    >
      {all ? "✓ " : ""}
      {label} {ids.length > 1 && <span className="opacity-60">({ids.length})</span>}
    </button>
  );
}
