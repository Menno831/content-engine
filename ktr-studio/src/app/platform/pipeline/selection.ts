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

// Anker voor shift-klik: de laatst (gewoon) aangeklikte kaart.
let anchor: string | null = null;

function emit() {
  for (const l of listeners) l();
}

export const selection = {
  toggle(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    anchor = id;
    emit();
  },
  // Klik met shift: selecteer alles tussen het anker en deze kaart.
  // De volgorde komt uit de DOM (elke checkbox draagt data-bulk-id),
  // zodat het bereik klopt met wat er visueel op het board staat.
  pick(id: string, shift: boolean) {
    if (shift && anchor && anchor !== id) {
      const order = Array.from(document.querySelectorAll("[data-bulk-id]"))
        .map((el) => el.getAttribute("data-bulk-id"))
        .filter(Boolean) as string[];
      const a = order.indexOf(anchor);
      const b = order.indexOf(id);
      if (a !== -1 && b !== -1) {
        for (const x of order.slice(Math.min(a, b), Math.max(a, b) + 1)) selected.add(x);
        emit();
        return;
      }
    }
    this.toggle(id);
  },
  clear() {
    selected.clear();
    anchor = null;
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
