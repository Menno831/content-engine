// ════════════════════════════════════════════════════════════════
// Integraties: types + status-helpers. Stuurt de "verbonden / niet
// verbonden / geen data"-states in de UI aan.
// ════════════════════════════════════════════════════════════════
import type { ProviderKey } from "@/lib/config";

export const providerMeta: Record<ProviderKey, { label: string; color: string }> = {
  instagram_scrape: { label: "Instagram (scrape)", color: "#E1306C" },
  instagram_graph: { label: "Instagram (officieel)", color: "#E1306C" },
  youtube: { label: "YouTube", color: "#FF0000" },
  manychat: { label: "ManyChat", color: "#2563EB" },
};

export type ConnectionState = "connected" | "error" | "disconnected" | "demo";

export interface IntegrationStatus {
  provider: ProviderKey;
  state: ConnectionState;
  lastSyncedAt?: string | null;
  error?: string | null;
}

/** Mens-leesbare samenvatting voor de UI. */
export function describeStatus(s: IntegrationStatus): string {
  switch (s.state) {
    case "demo":
      return "Demo-data — niet verbonden";
    case "connected":
      return s.lastSyncedAt
        ? `Verbonden · laatste sync ${new Date(s.lastSyncedAt).toLocaleString("nl-NL")}`
        : "Verbonden";
    case "error":
      return `Fout: ${s.error ?? "onbekend"}`;
    case "disconnected":
    default:
      return "Niet verbonden";
  }
}
