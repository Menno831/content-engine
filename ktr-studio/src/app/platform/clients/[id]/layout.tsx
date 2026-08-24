import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getClient } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { Avatar, Badge } from "../../_components";
import { fmtEur } from "../../_data";
import { ClientTabs } from "./ClientTabs";
import { SyncButton } from "../SyncButton";
import { PortalAccessButton } from "../PortalAccessButton";

const statusColor: Record<string, string> = {
  actief: "#34D399",
  onboarding: "#FBBF24",
  gepauzeerd: "#6B7280",
};

// Klant-werkstation: één kop met alle tabs eronder. Elke tab is een
// eigen route, zodat je een klantpagina kunt bookmarken en delen.
export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // Het werkstation is voor de agency: editors horen op het board,
  // klantlogins in hun eigen portaal — ook bij een directe URL.
  const { profile } = await getSessionContext();
  if (profile?.role === "editor") redirect("/platform/pipeline");
  if (profile?.role === "client") redirect("/platform");

  const { id } = await params;
  const c = await getClient(id);
  if (!c) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/platform/clients"
            className="rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-2.5 py-1.5 text-[13px] text-muted transition-all shrink-0"
          >
            ← Klanten
          </Link>
          <Avatar initials={c.initials} size={38} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl truncate">{c.name}</h1>
              <Badge color={statusColor[c.status] ?? "#6B7280"}>{c.status}</Badge>
            </div>
            <div className="text-[12px] text-muted truncate">
              {c.handle || "geen handle"}
              {c.monthlyValue > 0 && ` · ${fmtEur(c.monthlyValue)}/mnd`}
              {c.manager && ` · ${c.manager}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SyncButton clientId={c.id} />
          <PortalAccessButton clientId={c.id} clientName={c.name} />
        </div>
      </div>

      <ClientTabs clientId={c.id} />

      {children}
    </>
  );
}
