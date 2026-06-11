"use client";

// ════════════════════════════════════════════════════════════════
// Klant-switcher: pills bovenaan een pagina om snel te wisselen
// tussen "Alle klanten" en één specifieke klant. Stuurt ?client=<id>
// in de URL zodat server components erop kunnen filteren (en de
// keuze deelbaar/bookmarkbaar is). Behoudt overige params (bv. ?m=).
// ════════════════════════════════════════════════════════════════
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ClientFilter({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("client") ?? "";

  if (clients.length < 2) return null;

  function pick(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("client", id);
    else next.delete("client");
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
      <button
        onClick={() => pick("")}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-all ${
          !active
            ? "bg-accent text-background font-bold"
            : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
        }`}
      >
        Alle klanten
      </button>
      {clients.map((c) => (
        <button
          key={c.id}
          onClick={() => pick(c.id)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-all ${
            active === c.id
              ? "bg-accent text-background font-bold"
              : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
