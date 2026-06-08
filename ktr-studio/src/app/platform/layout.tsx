import type { ReactNode } from "react";
import { getSessionContext } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { Shell } from "./Shell";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const ctx = await getSessionContext();
  const notifications = await getNotifications();

  // Geen sessie (showroom/demo) -> behandel als agency-owner.
  const role = (ctx.profile?.role as "owner" | "team" | "client" | "editor" | "setter") ?? "owner";
  const isClient = role === "client";

  const roleLabels: Record<string, string> = {
    owner: "Agency owner",
    team: "Team",
    client: "Klantportaal",
    editor: "Editor",
    setter: "Setter",
  };

  const brandName = ctx.agency?.brand_name || "KTR Studio";
  const displayName = isClient
    ? ctx.clientName ?? "Klant"
    : ctx.profile?.full_name || "Menno Kater";
  const roleLabel = roleLabels[role] ?? "Team";

  return (
    <Shell
      role={role}
      brandName={brandName}
      displayName={displayName}
      roleLabel={roleLabel}
      notifications={notifications}
    >
      {children}
    </Shell>
  );
}
