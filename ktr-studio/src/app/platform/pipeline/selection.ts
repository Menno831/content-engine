"use client";

// ════════════════════════════════════════════════════════════════
// Piepklein globaal selectie-store voor het board: kaarten vinken →
// de balk onderin (BulkBar) voert de actie op alles tegelijk uit.
// Bewust geen context/provider: de kaarten zitten verspreid door
// server-gerenderde secties heen en dit is er maar één per pagina.
// ════════════════════════════════════════════════════════════════

type Listener = () => void;

const selected = new Set<string>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export const selection = {
  toggle(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    emit();
  },
  clear() {
    selected.clear();
    emit();
  },
  has: (id: string) => selected.has(id),
  ids: () => [...selected],
  count: () => selected.size,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
