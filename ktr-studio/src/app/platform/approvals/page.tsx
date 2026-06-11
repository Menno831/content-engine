import { PageHeader, Card, Badge, icons } from "../_components";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { NoData } from "../_states";
import { ApprovalActions } from "./ApprovalActions";
import { ClientFilter } from "../ClientFilter";

const formatColor: Record<string, string> = {
  Reel: "#F97316",
  Carrousel: "#A78BFA",
  Story: "#60A5FA",
  Short: "#34D399",
};

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const ctx = await getSessionContext();
  const isClient = ctx.profile?.role === "client";
  const { content, clients } = await getWorkspaceData();
  const activeClient = clients.find((c) => c.id === sp.client);
  const waiting = content.filter(
    (c) => c.stage === "client_approval" && (!activeClient || c.client === activeClient.name)
  );

  return (
    <>
      <PageHeader
        eyebrow="Goedkeuringen"
        title={isClient ? "Wacht op jouw akkoord" : "Wacht op klant"}
        subtitle={
          isClient
            ? "Bekijk de content die voor je klaarstaat en keur goed of vraag een revisie."
            : "Content die bij klanten ligt voor goedkeuring. Je krijgt een melding zodra ze reageren."
        }
      />

      {!isClient && <ClientFilter clients={clients.map((c) => ({ id: c.id, name: c.name }))} />}

      {waiting.length === 0 ? (
        <NoData label="Niets wacht op goedkeuring 🎉" />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {waiting.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge color={formatColor[c.format] ?? "#888"}>{c.format}</Badge>
                <span className="font-mono text-[10px] text-muted">{c.due}</span>
              </div>
              <h3 className="font-medium text-sm leading-snug mb-1.5">{c.title}</h3>
              <p className="text-[12px] text-muted leading-relaxed mb-3 line-clamp-2">&ldquo;{c.hook}&rdquo;</p>
              <div className="text-[11px] text-muted mb-4 flex items-center gap-1.5">
                <span className="text-accent">{icons.dot}</span> {c.client}
              </div>
              {isClient ? (
                <ApprovalActions contentId={c.id} />
              ) : (
                <Badge color="#60A5FA">wacht op {c.client}</Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
