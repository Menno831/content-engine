"use client";

// Wat er nog mist voor een kloppend overzicht — met per punt de
// kortste weg om het te fixen, en een ✕ om 'm weg te klikken tot het
// einde van de maand (volgende maand is het weer relevant).
import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { dismissFinanceTodoAction } from "./actions";

export interface TodoItem {
  /** Stabiele sleutel, bv. "factuur:<klant-id>" — nodig om weg te klikken. */
  key: string;
  text: string;
  href?: string;
  external?: boolean;
  action?: React.ReactNode; // bv. een dialoog-knop
}

export function FinanceTodo({ items }: { items: TodoItem[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const list = items.filter((i) => !hidden.includes(i.key));
  if (list.length === 0) return null;

  function dismiss(key: string) {
    setHidden((h) => [...h, key]);
    start(async () => {
      const r = await dismissFinanceTodoAction(key);
      if (r.error) setHidden((h) => h.filter((k) => k !== key)); // mislukt? weer laten zien
    });
  }

  return (
    <Card className="p-5 mb-6 border-accent/20 bg-accent/[0.03]">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <Eyebrow>Om het overzicht kloppend te krijgen</Eyebrow>
          <h2 className="font-display font-extrabold text-lg">{list.length} {list.length === 1 ? "ding" : "dingen"} nog te doen</h2>
        </div>
        <span className="text-[11px] text-muted">✕ = weg tot volgende maand</span>
      </div>
      <ul className="space-y-1.5">
        {list.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="flex items-start gap-2.5">
              <span className="text-accent shrink-0">·</span>
              <span>{it.text}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {it.action ??
                (it.href && (
                  <Link
                    href={it.href}
                    target={it.external ? "_blank" : undefined}
                    className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1 text-[12px] text-muted transition-all"
                  >
                    Fix →
                  </Link>
                ))}
              <button
                onClick={() => dismiss(it.key)}
                disabled={pending}
                title="Weg tot volgende maand"
                className="rounded-lg border border-white/[0.06] hover:border-white/20 px-2 py-1 text-[12px] text-muted/60 hover:text-muted transition-all disabled:opacity-50"
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
