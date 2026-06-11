// ════════════════════════════════════════════════════════════════
// Transkriptor API (server-only): audio/video -> tekst.
// Flow: get_upload_url -> bestand uploaden (browser, direct) ->
// transcriptie starten (url) -> pollen op order_id -> tekst ophalen.
// Vereist TRANSKRIPTOR_API_KEY (abonnement van Menno).
// ════════════════════════════════════════════════════════════════

const BASE = "https://api.tor.app/developer";

export const transkriptorConfigured = () => Boolean(process.env.TRANSKRIPTOR_API_KEY);

function headers() {
  return {
    Authorization: `Bearer ${process.env.TRANSKRIPTOR_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Stap 1: upload-URL aanvragen. De browser PUT het bestand er direct heen
// (zo blijft de API-key server-side en omzeilen we Vercel's request-limiet).
export async function getUploadUrl(fileName: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  const res = await fetch(`${BASE}/transcription/local_file/get_upload_url`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ file_name: fileName }),
  });
  if (!res.ok) throw new Error(`transkriptor_upload_url_${res.status}`);
  const data = await res.json();
  const uploadUrl = data.upload_url ?? data.uploadUrl;
  const publicUrl = data.public_url ?? data.publicUrl;
  if (!uploadUrl || !publicUrl) throw new Error("transkriptor_upload_url_onbekend_formaat");
  return { uploadUrl, publicUrl };
}

// Stap 2: transcriptie starten op de geüploade file.
export async function startTranscription(publicUrl: string, language = "nl-NL"): Promise<string> {
  const res = await fetch(`${BASE}/transcription/url`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url: publicUrl, language, service: "Standard" }),
  });
  if (!res.ok) throw new Error(`transkriptor_start_${res.status}`);
  const data = await res.json();
  const orderId = data.order_id ?? data.orderId;
  if (!orderId) throw new Error("transkriptor_start_geen_order_id");
  return String(orderId);
}

export interface TranscriptionStatus {
  done: boolean;
  failed: boolean;
  text?: string;
}

// Stap 3: status/inhoud ophalen. Verschillende response-vormen afvangen
// (content als segment-array met sprekers, of als platte tekst).
export async function getTranscription(orderId: string): Promise<TranscriptionStatus> {
  const res = await fetch(`${BASE}/files/${encodeURIComponent(orderId)}/content`, {
    method: "GET",
    headers: headers(),
  });

  if (res.status === 404 || res.status === 425) return { done: false, failed: false };
  if (!res.ok) {
    // Detail-endpoint raadplegen om 'm onderscheid te laten maken
    // tussen "nog bezig" en "mislukt".
    const det = await fetch(`${BASE}/files/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: headers(),
    }).catch(() => null);
    if (det?.ok) {
      const d = await det.json();
      const status = String(d.status ?? d.file?.status ?? "").toLowerCase();
      if (/fail|error/.test(status)) return { done: false, failed: true };
      return { done: false, failed: false };
    }
    return { done: false, failed: false };
  }

  const data = await res.json();
  const text = normalizeContent(data);
  if (!text) return { done: false, failed: false };
  return { done: true, failed: false, text };
}

function normalizeContent(data: any): string | null {
  // Vorm 1: { content: [{ text, speaker? }, ...] }
  const arr = data.content ?? data.segments ?? data.result?.content;
  if (Array.isArray(arr) && arr.length) {
    return arr
      .map((s: any) => {
        const t = String(s.text ?? s.Text ?? "").trim();
        if (!t) return null;
        const sp = s.speaker ?? s.Speaker;
        return sp != null && sp !== "" ? `${sp}: ${t}` : t;
      })
      .filter(Boolean)
      .join("\n");
  }
  // Vorm 2: platte tekst
  const flat = data.text ?? data.transcription ?? data.result?.text;
  if (typeof flat === "string" && flat.trim()) return flat.trim();
  return null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
