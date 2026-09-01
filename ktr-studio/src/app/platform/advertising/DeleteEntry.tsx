"use client";

import { useTransition } from "react";
import { deleteAdEntryAction } from "./actions";

export function DeleteEntry({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await deleteAdEntryAction(id); })}
      disabled={pending}
      title="Regel verwijderen"
      className="text-muted hover:text-red-400 disabled:opacity-40 transition-colors px-1"
    >
      {pending ? "…" : "×"}
    </button>
  );
}
