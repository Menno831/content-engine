"use client";

// ════════════════════════════════════════════════════════════════
// Overlays die in de header wonen (menu, ⌘K, bel) MOETEN via een
// portal op <body> renderen: de header heeft backdrop-blur en een
// element met backdrop-filter wordt het referentiekader voor fixed
// descendants — waardoor een "fixed inset-0"-overlay anders in de
// 64px hoge header geklemd wordt (het mobiele-menu-bug).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
