// Wat er nog mist voor een kloppend overzicht — met per punt de
// kortste weg om het te fixen. Verdwijnt als alles klopt.
import Link from "next/link";
import { Card, Eyebrow } from "../_components";

export interface TodoItem {
  text: string;
  href?: string;
  external?: boolean;
  action?: React.ReactNode; // bv. een dialoog-knop
}

export function FinanceTodo({ items }: { items: TodoItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="p-5 mb-6 border-accent/20 bg-accent/[0.03]">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <Eyebrow>Om het overzicht kloppend te krijgen</Eyebrow>
          <h2 className="font-display font-extrabold text-lg">{items.length} {items.length === 1 ? "ding" : "dingen"} nog te doen</h2>
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="flex items-start gap-2.5">
              <span className="text-accent shrink-0">·</span>
              <span>{it.text}</span>
            </span>
            {it.action ??
              (it.href && (
                <Link
                  href={it.href}
                  target={it.external ? "_blank" : undefined}
                  className="shrink-0 rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1 text-[12px] text-muted transition-all"
                >
                  Fix →
                </Link>
              ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}
