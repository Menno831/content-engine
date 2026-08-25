// ════════════════════════════════════════════════════════════════
// Frame.io (V4 / next.frame.io — Adobe): nieuwe uploads signaleren.
//
// Auth: Adobe IMS server-to-server (client_credentials). Menno maakt
// eenmalig een credential aan in de Adobe Developer Console (project
// met de "Frame.io API" erbij) en zet in Vercel:
//   FRAMEIO_CLIENT_ID + FRAMEIO_CLIENT_SECRET
// Het project-id staat in de database (agencies.frameio_project_id).
// ════════════════════════════════════════════════════════════════

const IMS_URL = "https://ims-na1.adobelogin.com/ims/token/v3";
const API = "https://api.frame.io/v4";

export interface FrameFile {
  id: string;
  name: string;
  createdAt: string | null;
  url: string; // deeplink naar de video in next.frame.io
}

export function frameioConfigured(): boolean {
  return Boolean(process.env.FRAMEIO_CLIENT_ID && process.env.FRAMEIO_CLIENT_SECRET);
}

// Toegangstoken bij Adobe halen (geldig ~24u; wij vragen per run een verse).
async function imsToken(): Promise<string> {
  const scope =
    process.env.FRAMEIO_SCOPE ??
    "openid,AdobeID,read_organizations,additional_info.projectedProductContext,frame.s2s.all";
  const res = await fetch(IMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.FRAMEIO_CLIENT_ID ?? "",
      client_secret: process.env.FRAMEIO_CLIENT_SECRET ?? "",
      grant_type: "client_credentials",
      scope,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Adobe-login faalt (${res.status}): ${JSON.stringify(json).slice(0, 160)}`);
  }
  return json.access_token as string;
}

async function api(token: string, path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "api-version": "experimental" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Frame.io ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 160)}`);
  return json;
}

// Alle bestanden in het project ophalen (root + submappen, met een cap
// zodat een run nooit ontspoort op een gigantisch archief).
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listProjectFiles(projectId: string): Promise<FrameFile[]> {
  const token = await imsToken();

  // Account-id: uit env of gewoon het eerste (enige) account op de credential.
  let accountId = process.env.FRAMEIO_ACCOUNT_ID ?? "";
  if (!accountId) {
    const accounts = await api(token, "/accounts");
    accountId = accounts?.data?.[0]?.id ?? "";
    if (!accountId) throw new Error("Geen Frame.io-account gevonden op deze credential.");
  }

  const project = await api(token, `/accounts/${accountId}/projects/${projectId}`);
  const rootId = project?.data?.root_folder_id;
  if (!rootId) throw new Error("Project gevonden maar zonder root-map — klopt het project-id?");

  const files: FrameFile[] = [];
  const queue: string[] = [rootId];
  let visited = 0;

  while (queue.length && visited < 25 && files.length < 300) {
    const folderId = queue.shift()!;
    visited += 1;
    const children = await api(token, `/accounts/${accountId}/folders/${folderId}/children`);
    for (const item of children?.data ?? []) {
      if (item.type === "folder") queue.push(item.id);
      else if (item.type === "file" || item.type === "version_stack") {
        files.push({
          id: item.id,
          name: item.name ?? "(naamloos)",
          createdAt: item.created_at ?? item.inserted_at ?? null,
          url: `https://next.frame.io/project/${projectId}/view/${item.id}`,
        });
      }
    }
  }

  // Nieuwste eerst — zo pakken meldingen en kaart-matching het recente werk.
  return files.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Titel-match tussen een Frame-bestandsnaam en een kaarttitel: genoeg
// overlap in genormaliseerde vorm ("Longform 2 v3.mp4" ↔ "Longform 2").
export function matchesTitle(fileName: string, cardTitle: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\.(mp4|mov|mxf|wav|mp3)$/i, "").replace(/[^a-z0-9]+/g, " ").trim();
  const f = norm(fileName);
  const c = norm(cardTitle);
  if (!f || !c) return false;
  return f.includes(c) || c.includes(f);
}
