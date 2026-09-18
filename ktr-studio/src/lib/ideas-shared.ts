// ════════════════════════════════════════════════════════════════
// Content-ideeën: constanten, types en de scriptstructuur. Bewust
// zonder server-imports zodat de schermen dit ook mogen laden.
// ════════════════════════════════════════════════════════════════

export const PILLARS = ["Value", "Documentation", "Lifestyle"] as const;

// Pijlerkleuren: vaste toewijzing, volgt de pijler en niet z'n plek
// in een lijst. Gevalideerd op onderscheid bij kleurenblindheid.
export const PILLAR_COLOR: Record<string, string> = {
  Value: "#DE5F0A",
  Documentation: "#3B82F6",
  Lifestyle: "#0F9E6E",
};

export const IDEA_STATUS = [
  { id: "nieuw", label: "Nieuw" },
  { id: "gekozen", label: "Deze ga ik maken" },
  { id: "gemaakt", label: "Script gemaakt" },
  { id: "afgewezen", label: "Niks voor mij" },
];

export interface IdeaSource {
  id: string;
  kind: string;
  title: string;
  happenedOn: string | null;
  url: string | null;
  createdAt: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  hook: string | null;
  angle: string | null;
  pillar: string | null;
  format: string | null;
  status: string;
  sourceId: string | null;
  sourceNote: string | null;
  scriptId: string | null;
  clientId: string | null;
  createdAt: string;
}

/**
 * Menno's vaste scriptstructuur, zoals uitgewerkt met Seth: vier
 * blokken die elk een eigen taak hebben. Een idee dat je omzet in
 * een script begint hiermee, zodat je nooit voor een leeg vel zit.
 */
export function scriptSkeleton(idea: { title: string; hook?: string | null; angle?: string | null; pillar?: string | null }): string {
  const hook = idea.hook?.trim() || "(je openingszin — de eerste 3 seconden)";
  return `HOOK — Curiosity (0-3 sec)
${hook}

Regels: koud openen, geen intro, geen "hey jongens". Eén zin die een
gat opent dat de kijker dicht wil hebben. Het sterkste beeld staat hier.

────────────────────────────────────────
CONTEXT (3-15 sec)
Waarom jij dit zegt. Eén concreet detail dat het waar maakt — een
bedrag, een datum, een plek. Niet je cv, één bewijsstuk.

${idea.angle ? `Uit de bron: ${idea.angle}\n` : ""}
────────────────────────────────────────
CHANGE (15-45 sec)
Wat er veranderde, of wat de kijker anders moet doen. Dit is de kern.
Één punt, niet drie. Concreet genoeg om morgen te doen.

────────────────────────────────────────
CLOSE (laatste 5 sec)
Hard afkappen op de laatste zin. Geen outro, geen "abonneer".
${idea.pillar === "Value" ? "CTA mag hier: keyword in de comments." : "Laat iets open — dat is de reden om te volgen."}

────────────────────────────────────────
BEELD
- Opening:
- B-roll:
- Wat er op het scherm staat:
`;
}
