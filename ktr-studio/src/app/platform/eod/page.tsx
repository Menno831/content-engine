import { PageHeader, Card, Avatar, Badge } from "../_components";
import { getEodReports } from "@/lib/workspace";
import { getSessionContext } from "@/lib/auth";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { EodForm } from "./EodForm";

// EOD: iedereen sluit z'n dag af in drie regels. Jij ziet in één scroll
// wat er die dag echt gebeurd is en waar mensen vastlopen.
export default async function EodPage() {
  const demo = DEMO_MODE || !isSupabaseConfigured;
  const [ctx, reports] = await Promise.all([getSessionContext(), demo ? [] : getEodReports(40)]);

  const today = new Date().toISOString().slice(0, 10);
  const mine = reports.find((r) => r.userId === ctx.user?.id && r.date === today) ?? null;
  const todays = reports.filter((r) => r.date === today);
  const earlier = reports.filter((r) => r.date !== today);

  return (
    <>
      <PageHeader
        eyebrow="End of day"
        title="Dag afsluiten"
        subtitle="Drie regels per dag: wat af is, waar je vastliep en wat morgen als eerste moet. Zo weet iedereen waar het staat zonder extra call."
      />

      {demo ? (
        <p className="text-sm text-muted">Demo-modus — EOD werkt in de echte omgeving.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <EodForm today={mine ? { done: mine.done ?? "", blockers: mine.blockers ?? "", tomorrow: mine.tomorrow ?? "", videos: mine.videos } : null} />
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display font-extrabold text-xl">Vandaag ingediend</h2>
                <Badge color={todays.length ? "#34D399" : "#6B7280"}>{todays.length}</Badge>
              </div>
              {todays.length === 0 ? (
                <p className="text-[13px] text-muted">Nog niemand. Jij eerst?</p>
              ) : (
                <div className="space-y-4">
                  {todays.map((r) => (
                    <EodItem key={r.id} report={r} />
                  ))}
                </div>
              )}
            </Card>

            {earlier.length > 0 && (
              <Card className="p-6">
                <h2 className="font-display font-extrabold text-xl mb-4">Eerder</h2>
                <div className="space-y-4">
                  {earlier.slice(0, 12).map((r) => (
                    <EodItem key={r.id} report={r} showDate />
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EodItem({
  report,
  showDate,
}: {
  report: { fullName: string | null; date: string; done: string | null; blockers: string | null; tomorrow: string | null; videos: number };
  showDate?: boolean;
}) {
  const name = report.fullName ?? "Teamlid";
  return (
    <div className="rounded-xl border border-white/[0.06] px-4 py-3">
      <div className="flex items-center gap-2.5 mb-2">
        <Avatar initials={name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()} size={26} />
        <span className="text-sm font-medium">{name}</span>
        {showDate && (
          <span className="text-[11.5px] text-muted">
            {new Date(report.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        )}
        {report.videos > 0 && <Badge color="#F97316">{report.videos} video&rsquo;s</Badge>}
      </div>
      {report.done && <p className="text-[13px] text-foreground/85 whitespace-pre-wrap">{report.done}</p>}
      {report.blockers && (
        <p className="text-[12.5px] text-amber-300 mt-1.5">
          <span className="text-muted">Vast: </span>
          {report.blockers}
        </p>
      )}
      {report.tomorrow && (
        <p className="text-[12.5px] text-muted mt-1">
          <span className="text-muted">Morgen: </span>
          {report.tomorrow}
        </p>
      )}
    </div>
  );
}
