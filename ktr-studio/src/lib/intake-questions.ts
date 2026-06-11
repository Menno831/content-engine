// ════════════════════════════════════════════════════════════════
// De vaste brand voice intake-vragen. Apart bestand zonder server-
// imports, zodat client components ('use client') ze ook kunnen
// gebruiken. De AI-synthese staat in lib/intake.ts (server-only).
// ════════════════════════════════════════════════════════════════

export interface IntakeQuestion {
  key: string;
  label: string;
  hint: string;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    key: "wie",
    label: "Wie ben je en wat doe je?",
    hint: "In je eigen woorden — alsof je het op een verjaardag uitlegt.",
  },
  {
    key: "doelgroep",
    label: "Voor wie maak je content?",
    hint: "Wie moet er stoppen met scrollen? Hoe oud, wat doen ze, waar lopen ze tegenaan?",
  },
  {
    key: "transformatie",
    label: "Wat verandert er voor je klanten door jou?",
    hint: "Van welke situatie A naar welke situatie B help je mensen?",
  },
  {
    key: "verhaal",
    label: "Wat is jouw verhaal?",
    hint: "Waar kom je vandaan, welk keerpunt maakte dat je dit nu doet?",
  },
  {
    key: "mening",
    label: "Waar ben je het ONeens mee in jouw vakgebied?",
    hint: "Welke populaire adviezen vind jij onzin? Dit wordt je scherpste content.",
  },
  {
    key: "toon",
    label: "Hoe praat je van nature?",
    hint: "Direct of zacht? Serieus of met humor? Netjes of straattaal? Wees eerlijk.",
  },
  {
    key: "uitdrukkingen",
    label: "Welke woorden of uitdrukkingen gebruik je vaak?",
    hint: "Stopwoordjes, vaste zinnetjes, dingen die mensen aan jou linken.",
  },
  {
    key: "nooit",
    label: "Welke woorden of stijl wil je NOOIT gebruiken?",
    hint: "Bijv. jargon, Engelse buzzwords, schreeuwerige sales-taal, emoji's…",
  },
  {
    key: "voorbeelden",
    label: "Welke creators of merken vind je qua stijl sterk?",
    hint: "Namen of @handles — en wat je precies goed vindt aan ze.",
  },
  {
    key: "bewijs",
    label: "Wat zijn je beste resultaten of verhalen tot nu toe?",
    hint: "Klantcases, cijfers, anekdotes — bewijs dat we in content kunnen verwerken.",
  },
];
