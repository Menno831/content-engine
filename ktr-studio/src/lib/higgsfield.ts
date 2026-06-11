// ════════════════════════════════════════════════════════════════
// Higgsfield API (server-only) — Soul text2image voor thumbnails &
// visuals in het vaste Soul-character van de klant.
// Auth: HIGGSFIELD_API_KEY in het formaat "KEY_ID:KEY_SECRET".
// Flow: POST /v1/text2image/soul -> job-set id -> poll /v1/job-sets/{id}
// -> jobs[].results.raw.url zodra COMPLETED.
// ════════════════════════════════════════════════════════════════

const BASE = "https://platform.higgsfield.ai";

export const higgsfieldConfigured = () => Boolean(process.env.HIGGSFIELD_API_KEY);

function headers() {
  return {
    Authorization: `Key ${process.env.HIGGSFIELD_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Bevestigde formaten uit de officiële SDK. Thumbnails croppen we
// desnoods uit vierkant — geen onbevestigde enums gokken.
export const SOUL_SIZES = {
  square: "SQUARE_1536x1536", // thumbnail / post (1:1)
  portrait: "PORTRAIT_1536x2048", // story / reel-cover (3:4)
} as const;
export type SoulSizeKey = keyof typeof SOUL_SIZES;

export interface SoulGenerateInput {
  prompt: string;
  size: SoulSizeKey;
  characterId?: string | null; // vast Soul-character van de klant
  batch?: "SINGLE" | "QUAD";
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Stap 1: generatie starten -> job-set id.
export async function submitSoulImage(input: SoulGenerateInput): Promise<string> {
  const params: Record<string, unknown> = {
    prompt: input.prompt,
    width_and_height: SOUL_SIZES[input.size],
    quality: "HD",
    batch_size: input.batch ?? "QUAD",
  };
  if (input.characterId) {
    params.custom_reference_id = input.characterId;
    params.custom_reference_strength = 1;
  }

  const res = await fetch(`${BASE}/v1/text2image/soul`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ params }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`higgsfield_submit_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const data = await res.json();
  const id = data.id ?? data.job_set_id ?? data.jobSetId;
  if (!id) throw new Error("higgsfield_geen_jobset_id");
  return String(id);
}

export interface SoulPollResult {
  done: boolean;
  failed: boolean;
  urls: string[];
  detail?: string;
}

// Stap 2: pollen tot alle jobs klaar zijn.
export async function pollSoulJobSet(jobSetId: string): Promise<SoulPollResult> {
  const res = await fetch(`${BASE}/v1/job-sets/${encodeURIComponent(jobSetId)}`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`higgsfield_poll_${res.status}`);
  const data = await res.json();

  const jobs: any[] = data.jobs ?? [];
  if (jobs.length === 0) return { done: false, failed: false, urls: [] };

  const statuses = jobs.map((j) => String(j.status ?? "").toUpperCase());
  const anyPending = statuses.some((s) => s === "QUEUED" || s === "IN_PROGRESS" || s === "");
  const urls = jobs
    .map((j) => j.results?.raw?.url ?? j.results?.min?.url ?? null)
    .filter((u): u is string => Boolean(u));

  if (anyPending) return { done: false, failed: false, urls };

  const allFailed = statuses.every((s) => s === "FAILED" || s === "CANCELED" || s === "NSFW");
  if (urls.length === 0 && allFailed) {
    return {
      done: false,
      failed: true,
      urls: [],
      detail: statuses.includes("NSFW") ? "Afgekeurd door de contentfilter (NSFW) — pas je prompt aan." : "Generatie mislukt bij Higgsfield.",
    };
  }
  return { done: true, failed: false, urls };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
