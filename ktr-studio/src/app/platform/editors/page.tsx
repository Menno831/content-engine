import Link from "next/link";
import { PageHeader, Card, Stat, Avatar, Badge, icons } from "../_components";
import { getEditors } from "@/lib/editors";
import { fmtEur, editorPayout, LATE_DEDUCTION } from "../_data";
import { AddEditorDialog } from "./AddEditorDialog";
import { EditorPool } from "./EditorPool";
import { NoData } from "../_states";
import { ExportButton } from "../ExportButton";

export default async function EditorsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "pool" ? "pool" : "payouts";
  const editors = await getEditors();
  const active = editors.filter((e) => e.active);

  const totalVideos = active.reduce((s, e) => s + e.videosThisMonth, 0);
  const totalNet = active.reduce((s, e) => s + editorPayout(e).net, 0);
  const totalDeduction = active.reduce((s, e) => s + editorPayout(e).deduction, 0);
  const totalLate = active.reduce((s, e) => s + e.lateVideos, 0);

  return (
    <>
      <PageHeader
        eyebrow="Editors"
        title="Productie & uitbetalingen"
        subtitle={`Video's per editor deze maand, met automatische deductie van ${Math.round(
          LATE_DEDUCTION * 100
        )}% per te late aanlevering.`}
        action={
          <div className="flex items-center gap-2">
            <ExportButton
              filename="uitbetalingen.csv"
              rows={editors.map((e) => {
                const p = editorPayout(e);
                return {
                  editor: e.name,
                  per_video: e.payPerVideo,
                  videos: e.videosThisMonth,
                  te_laat: e.lateVideos,
                  bruto: p.gross,
                  deductie: p.deduction,
                  netto: p.net,
                };
              })}
            />
            <AddEditorDialog />
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1 mb-6 w-fit">
        <Link
          href="/platform/editors"
          className={`rounded-lg px-4 py-1.5 text-[13px] transition-all ${tab === "payouts" ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"}`}
        >
          Uitbetalingen
        </Link>
        <Link
          href="/platform/editors?tab=pool"
          className={`rounded-lg px-4 py-1.5 text-[13px] transition-all ${tab === "pool" ? "bg-accent text-background font-bold" : "text-muted hover:text-foreground"}`}
        >
          Editor-pool
        </Link>
      </div>

      {tab === "pool" ? (
        editors.length === 0 ? <NoData label="Nog geen editors" /> : <EditorPool editors={editors} />
      ) : (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Video's deze maand" value={String(totalVideos)} icon={icons.pipeline} />
        <Stat label="Uit te betalen" value={fmtEur(totalNet)} icon={icons.money} />
        <Stat label="Deducties" value={fmtEur(totalDeduction)} delta={`${totalLate} te laat`} icon={icons.analytics} />
        <Stat label="Actieve editors" value={String(active.length)} icon={icons.studio} />
      </div>

      {editors.length === 0 ? (
        <NoData label="Nog geen editors" />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {editors.map((e) => {
            const pay = editorPayout(e);
            return (
              <Card key={e.id} hover className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={e.name.slice(0, 2).toUpperCase()} size={40} />
                    <div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-[12px] text-muted">{fmtEur(e.payPerVideo)} / video</div>
                    </div>
                  </div>
                  <Badge color={e.active ? "#34D399" : "#6B7280"}>{e.active ? "actief" : "inactief"}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/[0.05] text-center">
                  <div>
                    <div className="font-display font-bold text-lg">{e.videosThisMonth}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted">video&apos;s</div>
                  </div>
                  <div>
                    <div className={`font-display font-bold text-lg ${e.lateVideos > 0 ? "text-red-400" : ""}`}>{e.lateVideos}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted">te laat</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg text-emerald-400">{fmtEur(pay.net)}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted">netto</div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-[12px]">
                  <Row label="Bruto" value={fmtEur(pay.gross)} />
                  {pay.deduction > 0 && <Row label={`Deductie (${e.lateVideos}× te laat)`} value={`− ${fmtEur(pay.deduction)}`} red />}
                  <Row label="Uit te betalen" value={fmtEur(pay.net)} strong />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </>
      )}
    </>
  );
}

function Row({ label, value, red, strong }: { label: string; value: string; red?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${red ? "text-red-400" : ""} ${strong ? "font-bold text-foreground" : ""}`}>{value}</span>
    </div>
  );
}
