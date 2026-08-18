"use client";

// Persoonlijke takenlijst: twee kolommen — wat vandaag moet (hoge
// urgentie) en de lange termijn. Typ, Enter, klaar. Los van de
// klant-taken hieronder.

import { useState, useTransition } from "react";
import { Card, Badge } from "../_components";
import { createPersonalTodoAction, toggleTodoAction, deleteTodoAction } from "./actions";
import type { Todo } from "../_data";

const COLS = [
  { key: "vandaag", title: "Vandaag", hint: "hoge urgentie", color: "#F97316", placeholder: "Wat moet er vandaag gebeuren?" },
  { key: "later", title: "Lange termijn", hint: "lage urgentie", color: "#60A5FA", placeholder: "Wat mag later?" },
] as const;

export function PersonalTodos({ initial }: { initial: Todo[] }) {
  const [todos, setTodos] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({ vandaag: "", later: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function add(urgency: "vandaag" | "later") {
    const title = (drafts[urgency] ?? "").trim();
    if (!title) return;
    start(async () => {
      const r = await createPersonalTodoAction(title, urgency);
      if (r.error) setError(r.error);
      else {
        setError("");
        setTodos((cur) => [
          { id: `tmp-${Date.now()}`, client: "—", title, done: false, due: null, urgency, userId: "me" },
          ...cur,
        ]);
        setDrafts((d) => ({ ...d, [urgency]: "" }));
      }
    });
  }

  function toggle(id: string, done: boolean) {
    setTodos((cur) => cur.map((t) => (t.id === id ? { ...t, done } : t)));
    start(async () => {
      await toggleTodoAction(id, done);
    });
  }

  function remove(id: string) {
    setTodos((cur) => cur.filter((t) => t.id !== id));
    start(async () => {
      await deleteTodoAction(id);
    });
  }

  return (
    <div className="mb-8">
      <h2 className="font-display font-extrabold text-xl mb-3">Persoonlijk</h2>
      {error && <p className="text-[13px] text-red-400 mb-2">{error}</p>}
      <div className="grid lg:grid-cols-2 gap-6">
        {COLS.map((col) => {
          const items = todos.filter((t) => (t.urgency ?? "vandaag") === col.key);
          const open = items.filter((t) => !t.done);
          const done = items.filter((t) => t.done);
          return (
            <Card key={col.key} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold">{col.title}</h3>
                  <span className="text-[11px] font-mono text-muted">{col.hint}</span>
                </div>
                <Badge color={col.color}>{open.length}</Badge>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  value={drafts[col.key]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [col.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && add(col.key)}
                  placeholder={col.placeholder}
                  className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm outline-none focus:border-accent/40"
                />
                <button
                  onClick={() => add(col.key)}
                  disabled={pending || !(drafts[col.key] ?? "").trim()}
                  className="rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-background font-bold text-sm px-3.5 py-2 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="space-y-1">
                {open.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/[0.02] transition-colors group">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggle(t.id, true)}
                      disabled={t.id.startsWith("tmp-")}
                      className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm flex-1 min-w-0 truncate">{t.title}</span>
                    <button
                      onClick={() => remove(t.id)}
                      disabled={t.id.startsWith("tmp-")}
                      className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all"
                      title="Verwijderen"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {open.length === 0 && <p className="text-[12.5px] text-muted px-2.5 py-2">Niks open 🎉</p>}
                {done.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 opacity-50 group">
                    <input type="checkbox" checked onChange={() => toggle(t.id, false)} className="accent-[var(--accent)] w-4 h-4 cursor-pointer" />
                    <span className="text-sm flex-1 min-w-0 truncate line-through">{t.title}</span>
                    <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-[12px] text-muted hover:text-red-400 transition-all">✕</button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
