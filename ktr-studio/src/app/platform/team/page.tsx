import { PageHeader, Card } from "../_components";
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getEditors } from "@/lib/editors";
import { team as demoTeam, type TeamMember } from "../_data";
import { AddTeamDialog } from "./AddTeamDialog";
import { TeamMemberCard } from "./MemberDialog";

const roleMeta: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "#F97316" },
  team: { label: "Team", color: "#A78BFA" },
  editor: { label: "Editor", color: "#34D399" },
  setter: { label: "Setter", color: "#60A5FA" },
  client: { label: "Klant", color: "#6B7280" },
};

async function getTeam(): Promise<TeamMember[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoTeam;
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, role")
    .in("role", ["owner", "team", "editor", "setter"]);
  return (data ?? []).map((p) => ({
    id: p.user_id,
    name: p.full_name ?? "—",
    email: "",
    role: (p.role ?? "team") as TeamMember["role"],
  }));
}

export default async function TeamPage() {
  const members = await getTeam();
  const editors = await getEditors();
  const editorOptions = editors.map((e) => ({ id: e.id, label: e.name }));

  return (
    <>
      <PageHeader
        eyebrow="Team & toegang"
        title="Je team"
        subtitle="Geef teamleden een eigen login met de juiste rol — editors zien het productieboard, setters de CRM."
        action={<AddTeamDialog editors={editorOptions} />}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {members.map((m) => {
          const r = roleMeta[m.role] ?? roleMeta.team;
          return (
            <TeamMemberCard
              key={m.id}
              member={{ id: m.id, name: m.name, role: m.role }}
              roleLabel={r.label}
              roleColor={r.color}
              editors={editorOptions}
            />
          );
        })}
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="font-display font-bold mb-1">Editor</div>
          <p className="text-[13px] text-muted">Ziet het productieboard + taken. Verplaatst kaarten door de fases en levert aan.</p>
        </Card>
        <Card className="p-5">
          <div className="font-display font-bold mb-1">Setter</div>
          <p className="text-[13px] text-muted">Beheert de CRM/leads. Closed deals stromen automatisch door naar je omzet-dashboard.</p>
        </Card>
        <Card className="p-5">
          <div className="font-display font-bold mb-1">Klant</div>
          <p className="text-[13px] text-muted">Eigen portaal met alleen z&rsquo;n content, prestaties, taken en rapporten (via de Klanten-pagina).</p>
        </Card>
      </div>
    </>
  );
}
