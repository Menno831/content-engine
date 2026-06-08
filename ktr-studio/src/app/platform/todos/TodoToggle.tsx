"use client";

import { useState, useTransition } from "react";
import { toggleTodoAction } from "./actions";

export function TodoToggle({ todoId, done }: { todoId: string; done: boolean }) {
  const [checked, setChecked] = useState(done);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next); // optimistisch
    startTransition(async () => {
      const r = await toggleTodoAction(todoId, next);
      if (r.error) setChecked(!next); // terugdraaien bij fout
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`grid place-items-center w-5 h-5 rounded-md border transition-all ${
        checked
          ? "bg-accent border-accent text-background"
          : "border-white/20 hover:border-accent/50"
      }`}
      title={checked ? "Markeer als open" : "Markeer als klaar"}
    >
      {checked && (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
