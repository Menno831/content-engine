import { Card, Badge, Avatar } from "../../../_components";
import { getClient, getClientTranscripts } from "@/lib/data";
import { fmtEur } from "../../../_data";
import { BrandDocs } from "../../BrandDocs";
import { TranscriptsCard } from "../../TranscriptsCard";
import { DeleteClientButton } from "../../DeleteClientButton";
import { ChannelsEditor } from "../../ChannelsEditor";

const statusColor: Record<string, string> = {
  actief: "#34D399",
  onboarding: "#FBBF24",
  gepauzeerd: "#6B7280",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, transcripts] = await Promise.all([getClient(id), getClientTranscripts(id)]);

  if (!c) return null;

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info + opdrachten */}
        <div className="space-y-6">
        <Card className="p-6 h-fit">
          <div className="flex items-center gap-3 mb-5">
            <Avatar initials={c.initials} size={48} />
            <div className="min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              <Badge color={statusColor[c.status] ?? "#6B7280"}>{c.status}</Badge>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Pakket" value={c.packageName ?? "—"} />
            <Row label="Retainer" value={fmtEur(c.monthlyValue) + " / mnd"} />
            <Row label="Video's / maand" value={String(c.videosPerMonth)} />
            {c.contentMix && <Row label="Video-mix" value={c.contentMix} />}
            <Row label="Editor-kosten" value={fmtEur(c.editorCost)} />
            <Row label="Marge" value={fmtEur(c.monthlyValue - c.editorCost)} />
            <Row label="Betaalstatus" value={c.paymentStatus} />
            <Row label="Soul-character" value={c.soulCharacter ?? "—"} />
          </div>
          <ChannelsEditor
            clientId={c.id}
            igHandle={c.handle}
            ytChannel={c.ytChannel ?? ""}
            contentMix={c.contentMix ?? ""}
            asanaProject={c.asanaProject ?? ""}
            moneybirdContact={c.moneybirdContact ?? ""}
          />
          {c.notes && (
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-1">Notities</div>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{c.notes}</p>
            </div>
          )}
        </Card>

        <DeleteClientButton clientId={c.id} clientName={c.name} />
        </div>

        {/* Brand-context */}
        <div className="lg:col-span-2">
          <TranscriptsCard clientId={c.id} transcripts={transcripts} />
          <BrandDocs
            clientId={c.id}
            clientName={c.name}
            handle={c.handle}
            values={{
              brand_identity: c.brandIdentity ?? "",
              brand_story: c.brandStory ?? "",
              brand_strategy: c.brandStrategy ?? "",
              brand_voice: c.brandVoice ?? "",
              notes: c.notes ?? "",
              brand_primary: c.brandPrimary ?? "",
              brand_secondary: c.brandSecondary ?? "",
            }}
          />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
