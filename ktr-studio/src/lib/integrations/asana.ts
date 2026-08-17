// ════════════════════════════════════════════════════════════════
// Asana-koppeling voor klanten die op hun eigen Asana-bord werken
// (zoals Arthur en Bryan). Twee kanten op:
//   1. Pull  — taken van het Asana-project → kaarten op ons board
//              (secties worden op onze fases gemapt).
//   2. Push  — een kaart hier naar een andere fase slepen verplaatst
//              de taak in Asana naar de bijbehorende sectie.
//
// Nodig in Vercel: ASANA_TOKEN (Personal Access Token,
// app.asana.com → Instellingen → Apps → Developer apps → token).
// Per klant: asana_project_id op het klantprofiel (het lange nummer
// in de Asana-URL van het bord).
// ════════════════════════════════════════════════════════════════

const TOKEN = process.env.ASANA_TOKEN || "";

export const asanaConfigured = () => Boolean(TOKEN);

/* eslint-disable @typescript-eslint/no-explicit-any */

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://app.asana.com/api/1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`asana ${res.status}`);
  return res.json();
}

// Sectienaam (Engels of Nederlands, ruwweg) → onze pipeline-fase.
// Volgorde is belangrijk: "revisions completed" moet vóór "revisions".
export function sectionToStage(name: string): string {
  const n = name.toLowerCase();
  if (/(posted|live|published|gepost)/.test(n)) return "posted";
  if (/(ready.*post|schedul|te posten|klaar om te posten)/.test(n)) return "ready_for_posting";
  if (/(approval|akkoord|goedkeuring)/.test(n)) return "client_approval";
  if (/revisi\w*\s*(done|complete|completed|klaar|voltooid)/.test(n)) return "revisions_completed";
  if (/(revisi|feedback|wijzig)/.test(n)) return "revisions_needed";
  if (/(quality|review|controle|\bqc\b)/.test(n)) return "quality_control";
  if (/edit/.test(n)) return "ready_for_editing";
  return "ideation";
}

export interface AsanaTask {
  gid: string;
  name: string;
  dueOn: string | null;
  completed: boolean;
  stage: string;
  permalink: string | null;
}

/** Alle open taken + recent afgeronde (90 dagen) van een Asana-project. */
export async function fetchAsanaProject(projectGid: string): Promise<AsanaTask[]> {
  if (!TOKEN) throw new Error("not_configured");

  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const fields = "name,due_on,completed,permalink_url,memberships.section.name,memberships.project.gid";
  const tasks: AsanaTask[] = [];
  let offset = "";

  // Paginatie: Asana geeft max 100 per pagina.
  for (let page = 0; page < 10; page++) {
    const data = await api(
      `/tasks?project=${projectGid}&completed_since=${encodeURIComponent(since)}&opt_fields=${fields}&limit=100${offset ? `&offset=${offset}` : ""}`
    );
    for (const t of data.data ?? []) {
      const membership = (t.memberships ?? []).find((m: any) => m.project?.gid === projectGid) ?? (t.memberships ?? [])[0];
      const sectionName = membership?.section?.name ?? "";
      tasks.push({
        gid: String(t.gid),
        name: t.name ?? "",
        dueOn: t.due_on ?? null,
        completed: Boolean(t.completed),
        // Afgevinkt in Asana = klaar = bij ons "posted".
        stage: t.completed ? "posted" : sectionToStage(sectionName),
        permalink: t.permalink_url ?? null,
      });
    }
    offset = data.next_page?.offset ?? "";
    if (!offset) break;
  }

  return tasks.filter((t) => t.name.trim().length > 0);
}

/**
 * Push: verplaats een Asana-taak naar de sectie die bij onze fase hoort.
 * Best-effort — als er geen passende sectie is doen we niets.
 */
export async function moveAsanaTaskToStage(projectGid: string, taskGid: string, stage: string): Promise<void> {
  if (!TOKEN) return;
  const sections = await api(`/projects/${projectGid}/sections?limit=100`);
  const target = (sections.data ?? []).find((s: any) => sectionToStage(s.name ?? "") === stage);
  if (!target) return;
  await api(`/sections/${target.gid}/addTask`, {
    method: "POST",
    body: JSON.stringify({ data: { task: taskGid } }),
  });
}

/* eslint-enable @typescript-eslint/no-explicit-any */
