import type { ReactNode } from "react";
import { getSessionContext } from "@/lib/auth";
import { Shell } from "./Shell";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const ctx = await getSessionContext();

  // Geen sessie (showroom/demo) -> behandel als agency-owner.
  const role = (ctx.profile?.role as "owner" | "team" | "client") ?? "owner";
  const isClient = role === "client";

  const brandName = ctx.agency?.brand_name || "KTR Studio";
  const displayName = isClient
    ? ctx.clientName ?? "Klant"
    : ctx.profile?.full_name || "Menno Kater";
  const roleLabel = isClient ? "Klantportaal" : role === "team" ? "Team" : "Agency owner";

  return (
    <Shell role={role} brandName={brandName} displayName={displayName} roleLabel={roleLabel}>
      {children}
    </Shell>
  );
}
