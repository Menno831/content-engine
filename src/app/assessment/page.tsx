"use client";

import { useState, useEffect, useCallback } from "react";

/* ══════════════════════════════════════
   CONFIG
   ══════════════════════════════════════ */
const DEMO_MODE = false; // Live met Instagram Scraper 2025 API

/* ══════════════════════════════════════
   INSTAGRAM DATA FETCHER
   ══════════════════════════════════════ */
async function fetchInstagramData(handle: string): Promise<IGData | null> {
  const clean = handle.replace("@", "").trim().toLowerCase();

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 2500));
    return null;
  }

  try {
    const res = await fetch(`/api/instagram?handle=${encodeURIComponent(clean)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════
   TYPES
   ══════════════════════════════════════ */
interface IGData {
  username: string;
  followers: number;
  following: number;
  totalPosts: number;
  feedPostCount: number;
  avgFeedLikes: number;
  avgFeedComments: number;
  reelsCount: number;
  reelsPercentage: number;
  avgReelsViews: number;
  avgReelLikes: number;
  avgReelComments: number;
  bestReelViews: number;
  worstReelViews: number;
  avgLikes: number;
  avgComments: number;
  lastPostDaysAgo: number;
  postsPerWeek: number;
  hasCTAInBio: boolean;
  hasLinkInBio: boolean;
  hasAuthorityBio: boolean;
  engagementRate: number;
  viewToFollowerRatio: number;
  reelsOutperformFeed: boolean;
  reelsLikesMultiplier: number | null;
}

interface Insight {
  title: string;
  text: string;
  priority: "high" | "medium";
}

interface IGAnalysis {
  score: number;
  flags: Insight[];
  stats: {
    followers: number;
    reelsPercentage: number;
    engagementRate: number;
    lastPostDaysAgo: number;
  } | null;
}

interface QuestionOption {
  label: string;
  score: number;
}

interface Question {
  id: string;
  question: string;
  subtitle: string;
  options: QuestionOption[];
}

interface Answer extends QuestionOption {
  id: string;
}

/* ══════════════════════════════════════
   QUESTIONS.Personal brands & founders
   ══════════════════════════════════════ */
const questions: Question[] = [
  {
    id: "reels_freq",
    question: "Hoe vaak post je Reels?",
    subtitle: "Instagram Reels, TikToks, YouTube Shorts. Korte video content.",
    options: [
      { label: "Nooit of bijna nooit", score: 0 },
      { label: "Een paar keer per maand", score: 1 },
      { label: "Wekelijks", score: 2 },
      { label: "3+ keer per week", score: 3 },
    ],
  },
  {
    id: "reels_type",
    question: "Wat voor type Reels maak je?",
    subtitle: "Welk format gebruik je het meest?",
    options: [
      { label: "Ik maak geen Reels", score: 0 },
      { label: "Trends, memes, of gedeelde content", score: 1 },
      { label: "Mix van trending en eigen talking head", score: 2 },
      { label: "Vooral talking head over mijn expertise en verhaal", score: 3 },
    ],
  },
  {
    id: "personal_brand",
    question: "Hoe sterk is je personal brand online?",
    subtitle: "Worden mensen warm voordat ze met je praten?",
    options: [
      { label: "Mensen kennen me niet online", score: 0 },
      { label: "Een klein netwerk kent me, maar niet breder", score: 1 },
      { label: "Ik word herkend in mijn niche", score: 2 },
      { label: "Mensen zoeken mij op, ik ben de autoriteit", score: 3 },
    ],
  },
  {
    id: "funnel",
    question: "Hoe komen je klanten nu binnen?",
    subtitle: "Waar komt het meeste nieuwe business vandaan?",
    options: [
      { label: "Cold outreach (DM's, calls, e-mails)", score: 0 },
      { label: "Netwerk en mond-tot-mond", score: 1 },
      { label: "Mix van outbound en inbound", score: 2 },
      { label: "Inbound, ze komen naar mij via content", score: 3 },
    ],
  },
  {
    id: "conversion",
    question: "Levert je content leads of omzet op?",
    subtitle: "Niet volgers of likes, echte business.",
    options: [
      { label: "Nee, nul", score: 0 },
      { label: "Soms engagement, maar geen leads", score: 1 },
      { label: "Af en toe een lead via DM of link in bio", score: 2 },
      { label: "Structureel, content is mijn primaire leadkanaal", score: 3 },
    ],
  },
  {
    id: "time",
    question: "Hoeveel uur per week besteed je aan content?",
    subtitle: "Brainstormen, opnemen, editen, posten, reageren.",
    options: [
      { label: "0 uur, ik doe het niet", score: 0 },
      { label: "1–3 uur", score: 1 },
      { label: "3–6 uur", score: 2 },
      { label: "6+ uur", score: 3 },
    ],
  },
];

const MAX_QUIZ_SCORE = questions.length * 3;
const MAX_IG_SCORE = 15;
const MAX_TOTAL = MAX_QUIZ_SCORE + MAX_IG_SCORE;

/* ══════════════════════════════════════
   SCORING
   ══════════════════════════════════════ */
function getScoreCategory(pct: number) {
  if (pct <= 20) return { label: "Kritiek", color: "text-red-500", ring: "stroke-red-500", bg: "bg-red-500/10 border-red-500/20" };
  if (pct <= 45) return { label: "Achterstand", color: "text-accent", ring: "stroke-accent", bg: "bg-accent/10 border-accent/20" };
  if (pct <= 70) return { label: "Op weg", color: "text-yellow-500", ring: "stroke-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" };
  return { label: "Sterk", color: "text-green-500", ring: "stroke-green-500", bg: "bg-green-500/10 border-green-500/20" };
}

function analyzeInstagram(data: IGData | null): IGAnalysis {
  if (!data) return { score: 0, flags: [], stats: null };
  let score = 0;
  const flags: Insight[] = [];

  // Reels ratio
  if (data.reelsCount >= 10) score += 3;
  else if (data.reelsCount >= 5) { score += 2; flags.push({ title: `${data.reelsCount} Reels gevonden`, text: `Je maakt Reels, maar niet genoeg voor consistent bereik. De top founders posten 3-5 Reels per week. Jouw Reels krijgen gemiddeld ${data.avgReelsViews.toLocaleString()} views — dat is ${data.viewToFollowerRatio}% van je volgers.`, priority: "medium" }); }
  else if (data.reelsCount >= 1) { score += 1; flags.push({ title: `Slechts ${data.reelsCount} Reel${data.reelsCount > 1 ? "s" : ""} op je profiel`, text: `Instagram geeft Reels 2-3x meer bereik dan foto's of carousels.${data.reelsLikesMultiplier ? ` Jouw Reels krijgen ${data.reelsLikesMultiplier}x meer likes dan je feed posts — bewijs dat video werkt voor jou.` : " Begin met 1 Reel per week en bouw op."}`, priority: "high" }); }
  else flags.push({ title: "Geen Reels op je profiel", text: "Dit is je grootste gemiste kans. Zonder Reels ben je onzichtbaar voor nieuwe mensen. Founders die talking head Reels maken krijgen structureel meer bereik, DM's en leads. Je hoeft niet te dansen — praat gewoon over je expertise.", priority: "high" });

  // Reels performance (if they have reels)
  if (data.reelsCount > 0 && data.avgReelsViews > 0) {
    const spread = data.bestReelViews > 0 && data.worstReelViews > 0
      ? Math.round(data.bestReelViews / data.worstReelViews)
      : 0;
    if (spread > 5) {
      flags.push({ title: `Beste Reel: ${data.bestReelViews.toLocaleString()} views vs slechtste: ${data.worstReelViews.toLocaleString()}`, text: `Je bereik varieert sterk (${spread}x verschil). Dit wijst op inconsistente hooks. Analyseer je best presterende Reel — welke hook gebruikte je? Welk onderwerp? Maak daar meer van.`, priority: "medium" });
    }
  }

  // Reels vs Feed comparison
  if (data.reelsOutperformFeed && data.reelsLikesMultiplier && data.reelsLikesMultiplier > 1.5) {
    flags.push({ title: `Reels scoren ${data.reelsLikesMultiplier}x beter dan je feed`, text: `Je Reels krijgen gemiddeld ${data.avgReelLikes} likes vs ${data.avgFeedLikes} op feed posts. Het algoritme beloont je video content — maak hier je prioriteit van.`, priority: "medium" });
  }

  // Posting frequency
  if (data.lastPostDaysAgo <= 2) score += 3;
  else if (data.lastPostDaysAgo <= 5) score += 2;
  else if (data.lastPostDaysAgo <= 10) { score += 1; flags.push({ title: `Laatste post: ${data.lastPostDaysAgo} dagen geleden`, text: "Voor een personal brand is consistentie alles. 3-5x per week is de sweet spot voor founders.", priority: "high" }); }
  else flags.push({ title: data.lastPostDaysAgo > 30 ? `Al ${data.lastPostDaysAgo} dagen niet gepost` : `${data.lastPostDaysAgo} dagen stilte`, text: "Je account verliest dagelijks relevantie. Het algoritme vergeet je na 7-10 dagen inactiviteit. Begin met 1 post deze week — consistentie wint altijd van perfectie.", priority: "high" });

  // Engagement
  const eng = data.engagementRate;
  if (eng >= 5) score += 3;
  else if (eng >= 3) score += 2;
  else if (eng >= 1.5) { score += 1; flags.push({ title: `Engagement rate: ${eng}%`, text: "Voor een personal brand is dit onder gemiddeld. Posts met een duidelijke mening of concreet framework scoren 2-3x beter. Probeer: 'De 3 fouten die ik zie bij [jouw niche]' als format.", priority: "medium" }); }
  else flags.push({ title: `Engagement rate: ${eng}% — te laag`, text: "Je volgers scrollen langs je content. Nicheer je boodschap, stel vragen, en deel controversiele takes. Talking head Reels scoren veel beter op engagement.", priority: "high" });

  // Bio
  let bioScore = 0;
  if (data.hasLinkInBio) bioScore += 1;
  if (data.hasCTAInBio) bioScore += 1;
  if (data.hasAuthorityBio) bioScore += 1;
  score += bioScore;
  if (bioScore < 3) {
    const missing = [];
    if (!data.hasLinkInBio) missing.push("geen link");
    if (!data.hasCTAInBio) missing.push("geen CTA");
    if (!data.hasAuthorityBio) missing.push("geen positionering");
    flags.push({ title: `Bio mist: ${missing.join(", ")}`, text: "Je bio is je elevator pitch. Bezoekers beslissen in 3 seconden. Zeg glashelder: wie je bent, wie je helpt, en wat de volgende stap is.", priority: bioScore === 0 ? "high" : "medium" });
  }

  // Reels views reach
  const vr = data.viewToFollowerRatio;
  if (vr >= 100) score += 3;
  else if (vr >= 40) score += 2;
  else if (vr >= 15) { score += 1; flags.push({ title: `Reels bereiken ${vr}% van je volgers`, text: "Het algoritme pusht je content niet ver genoeg. Werk aan sterkere hooks in de eerste 1,5 seconde — dat bepaalt 80% van je bereik.", priority: "medium" }); }
  else if (data.reelsCount > 0) flags.push({ title: vr > 0 ? `Reels bereiken maar ${vr}% van je volgers` : "Reels krijgen weinig views", text: "Zwakke hooks of te brede content. Nicheer je boodschap en begin elke Reel met een herkenbaar probleem van je ideale klant.", priority: "high" });

  return {
    score,
    flags: flags.slice(0, 6),
    stats: { followers: data.followers, reelsPercentage: data.reelsPercentage, engagementRate: eng, lastPostDaysAgo: data.lastPostDaysAgo },
  };
}

function getQuizInsights(answers: Answer[]): Insight[] {
  const insights: Insight[] = [];
  const get = (id: string) => answers.find((a) => a.id === id);

  const brand = get("personal_brand");
  if (brand && brand.score <= 1) insights.push({ title: "Je personal brand is onzichtbaar", text: "Als founder is jouw gezicht je grootste asset. Een sterk personal brand via Reels maakt dat prospects je al vertrouwen vóórdat het eerste gesprek.", priority: "high" });

  const type = get("reels_type");
  if (type && type.score <= 1) insights.push({ title: "Trends volgen bouwt geen autoriteit", text: "Memes en trending audio geven soms views, maar geen expertpositie. Talking head Reels converteren 5-10x beter naar leads.", priority: "high" });

  const funnel = get("funnel");
  if (funnel && funnel.score <= 1) insights.push({ title: "Je bent afhankelijk van actieve acquisitie", text: "Zonder inbound via content moet je elke klant handmatig binnenhalen. Een Reels-systeem trekt leads naar jou toe, ook als je een week niet opneemt.", priority: "high" });

  const conv = get("conversion");
  if (conv && conv.score <= 1) insights.push({ title: "Content zonder conversie is een hobby", text: "Je mist bottom-funnel Reels: case studies, klantverhalen, directe CTA's die volgers omzetten in gesprekken.", priority: "high" });

  const time = get("time");
  if (time && time.score >= 2) insights.push({ title: "Je besteedt te veel tijd aan content", text: `${time.score === 3 ? "6+" : "3-6"} uur/week is als founder te veel. Het ideale model: jij neemt 1-2x per maand op, wij maken daar 10-15+ Reels van.`, priority: "medium" });

  const freq = get("reels_freq");
  if (freq && freq.score <= 1) insights.push({ title: "Je post te weinig voor momentum", text: "Het algoritme beloont consistentie. Minimaal 3x per week Reels posten geeft exponentieel meer bereik.", priority: "high" });

  return insights;
}

/* ══════════════════════════════════════
   UI COMPONENTS
   ══════════════════════════════════════ */

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-2 text-xs text-muted">
        <span>Vraag {current} van {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1 bg-card rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-accent to-orange-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionStep({ question, onAnswer, idx, total }: { question: Question; onAnswer: (o: QuestionOption) => void; idx: number; total: number }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div key={question.id} className="animate-fade-in">
      <ProgressBar current={idx + 1} total={total} />
      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mb-2 leading-tight">
        {question.question}
      </h2>
      <p className="text-muted text-sm mb-7">{question.subtitle}</p>
      <div className="flex flex-col gap-2.5">
        {question.options.map((opt, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              onClick={() => { setSelected(i); setTimeout(() => onAnswer(opt), 280); }}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                active
                  ? "bg-accent/10 border-accent text-accent font-semibold"
                  : "bg-white/[0.015] border-white/[0.06] text-foreground/70 hover:bg-white/[0.04] hover:border-white/[0.1]"
              }`}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                active ? "border-accent text-accent bg-accent/10" : "border-white/[0.1] text-white/30"
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScoreGauge({ percentage }: { percentage: number }) {
  const cat = getScoreCategory(percentage);
  const circ = 2 * Math.PI * 52;
  const [offset, setOffset] = useState(circ);
  useEffect(() => { const t = setTimeout(() => setOffset(circ - (percentage / 100) * circ), 100); return () => clearTimeout(t); }, [percentage, circ]);

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative w-[130px] h-[130px]">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="52" fill="none" className="stroke-card-border" strokeWidth="8" />
          <circle cx="65" cy="65" r="52" fill="none" className={cat.ring} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-foreground">{percentage}</span>
          <span className="text-xs text-muted -mt-0.5">/ 100</span>
        </div>
      </div>
      <span className={`mt-3 px-4 py-1 rounded-full border text-xs font-bold tracking-wide ${cat.bg} ${cat.color}`}>
        {cat.label}
      </span>
    </div>
  );
}

function IGStats({ stats }: { stats: IGAnalysis["stats"] }) {
  if (!stats) return null;
  const items = [
    { label: "Volgers", value: stats.followers >= 1000 ? `${(stats.followers / 1000).toFixed(1)}K` : String(stats.followers) },
    { label: "Reels", value: `${stats.reelsPercentage}%` },
    { label: "Engagement", value: `${stats.engagementRate}%` },
    { label: "Laatste post", value: stats.lastPostDaysAgo <= 1 ? "Vandaag" : `${stats.lastPostDaysAgo} dgn geleden` },
  ];
  return (
    <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.05] mb-7">
      {items.map((s, i) => (
        <div key={i} className="text-center py-3.5 px-2 bg-background/80">
          <div className="text-lg font-extrabold text-foreground">{s.value}</div>
          <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function AnalyzingScreen({ handle }: { handle: string }) {
  const [step, setStep] = useState(0);
  const steps = [`@${handle} ophalen...`, "Reels analyseren...", "Engagement berekenen...", "Rapport samenstellen..."];
  useEffect(() => { const t = steps.map((_, i) => setTimeout(() => setStep(i), i * 650)); return () => t.forEach(clearTimeout); }, []);

  return (
    <div className="text-center py-10 animate-fade-in">
      <div className="w-11 h-11 rounded-full border-[3px] border-card-border border-t-accent animate-spin mx-auto mb-6" />
      <h2 className="font-display text-xl font-bold text-foreground mb-6">Profiel analyseren</h2>
      <div className="flex flex-col gap-3 max-w-[220px] mx-auto">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2.5 transition-opacity duration-300 ${i <= step ? "opacity-100" : "opacity-20"}`}>
            <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center text-[9px] ${
              i < step ? "border-accent bg-accent/10 text-accent" : i === step ? "border-accent text-accent" : "border-white/10"
            }`}>{i < step ? "✓" : ""}</div>
            <span className={`text-xs ${i <= step ? "text-foreground/70" : "text-muted/40"}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultScreen({
  answers, quizScore, igAnalysis, onReset, handle,
}: {
  answers: Answer[]; quizScore: number; igAnalysis: IGAnalysis; onReset: () => void; handle: string;
}) {
  const total = quizScore + igAnalysis.score;
  const max = igAnalysis.stats ? MAX_TOTAL : MAX_QUIZ_SCORE;
  const percentage = Math.round((total / max) * 100);
  const quizInsights = getQuizInsights(answers);
  const allInsights = [...igAnalysis.flags, ...quizInsights].slice(0, 5);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [sending, setSending] = useState(false);
  const handleSubmit = useCallback(async () => {
    if (!email || !email.includes("@") || sending) return;
    setSending(true);
    try {
      await fetch("/api/assessment-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username: handle,
          score: percentage,
          answers,
          igData: igAnalysis,
        }),
      });
    } catch {
      // Silent fail
    }
    setSubmitted(true);
    setSending(false);
  }, [email, sending, handle, percentage, answers, igAnalysis]);

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <p className="text-[11px] font-bold tracking-[0.15em] text-accent uppercase mb-3">Jouw Content Score</p>
        <ScoreGauge percentage={percentage} />
        <p className="text-muted text-sm max-w-[400px] mx-auto leading-relaxed">
          {percentage <= 20
            ? "Je laat serieus omzet liggen. Zonder Reels-systeem verlies je als founder marktpositie aan concurrenten die het wél doen."
            : percentage <= 45
            ? "Je hebt een basis, maar je aanpak is niet consistent genoeg om je personal brand als leadkanaal te laten werken."
            : percentage <= 70
            ? "Je bent op weg. Er zijn concrete verbeterpunten die je van 'zichtbaar' naar 'onmisbaar in je niche' tillen."
            : "Sterk! Je personal brand werkt. Er zijn nog optimalisaties mogelijk om conversie verder te verhogen."}
        </p>
      </div>

      <IGStats stats={igAnalysis.stats} />

      {allInsights.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-foreground mb-4">Dit valt ons op:</h3>
          <div className="flex flex-col gap-2.5">
            {allInsights.map((ins, i) => (
              <div key={i} className={`px-4 py-3.5 bg-white/[0.015] border border-white/[0.05] rounded-xl ${
                ins.priority === "high" ? "border-l-[3px] border-l-accent" : "border-l-[3px] border-l-yellow-500"
              }`}>
                <h4 className="text-[13px] font-bold text-foreground mb-1">{ins.title}</h4>
                <p className="text-xs text-muted leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email capture */}
      <div className="p-6 rounded-2xl mb-5 bg-gradient-to-br from-accent/[0.07] to-accent/[0.02] border border-accent/20">
        {!submitted ? (
          <>
            <h3 className="font-display text-base font-bold text-foreground mb-1">Ontvang je volledige Content Rapport</h3>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Uitgebreide analyse met een concrete Reels-strategie op maat voor jouw personal brand. Geen spam.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="je@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="flex-1 px-3.5 py-3 bg-black/40 border border-white/[0.08] rounded-lg text-foreground text-sm outline-none focus:border-accent/40 transition-colors placeholder:text-white/20"
              />
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-background text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Verstuur
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-1">
            <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-2 text-green-500 text-sm">✓</div>
            <h3 className="text-sm font-bold text-foreground mb-1">Check je inbox</h3>
            <p className="text-xs text-muted">Je rapport komt binnen 24 uur op <strong className="text-foreground/80">{email}</strong>.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2.5">
        <button onClick={onReset} className="flex-1 py-3 bg-transparent border border-white/[0.06] rounded-lg text-muted text-xs cursor-pointer hover:bg-white/[0.02] transition-colors">
          Opnieuw
        </button>
        <a href="/book" className="flex-[2] py-3 bg-accent/[0.08] border border-accent/20 rounded-lg text-accent text-sm font-bold text-center hover:bg-accent/[0.15] transition-colors">
          Plan een gratis gesprek
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   INTRO SCREEN
   ══════════════════════════════════════ */
function IntroScreen({ onStart }: { onStart: (h: string) => void }) {
  const [handle, setHandle] = useState("");
  const canStart = handle.length >= 2;

  return (
    <div className="text-center animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2" strokeLinecap="round">
          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>
      <p className="text-[11px] font-bold tracking-[0.15em] text-accent uppercase mb-2">
        Gratis Reels Assessment
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground leading-[1.1] mb-3">
        Hoe sterk is jouw<br />
        <span className="text-accent">personal brand op Instagram?</span>
      </h1>
      <p className="text-muted text-sm leading-relaxed max-w-[360px] mx-auto mb-7">
        We analyseren je Instagram-profiel en stellen 6 vragen over je Reels-strategie. Je krijgt direct een score met concrete verbeterpunten.
      </p>

      <div className="max-w-[320px] mx-auto mb-5">
        <div className="flex items-center bg-white/[0.025] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-accent/30 transition-colors">
          <span className="pl-4 text-white/20 text-sm font-semibold select-none">@</span>
          <input
            type="text"
            placeholder="jouw.instagram"
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && canStart && onStart(handle)}
            className="flex-1 py-3.5 px-2 bg-transparent text-foreground text-sm outline-none placeholder:text-white/15"
          />
        </div>
      </div>

      <button
        onClick={() => canStart && onStart(handle)}
        disabled={!canStart}
        className={`px-10 py-3.5 rounded-xl text-base font-bold transition-all duration-200 cursor-pointer ${
          canStart
            ? "bg-accent hover:bg-accent-hover text-background shadow-lg shadow-accent/15 hover:shadow-accent/25 hover:-translate-y-0.5"
            : "bg-white/[0.06] text-white/30 cursor-not-allowed"
        }`}
      >
        Analyseer mijn profiel
      </button>
      <p className="text-white/20 text-[11px] mt-3.5">Gratis · 2 minuten · Geen account nodig</p>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════ */
export default function AssessmentPage() {
  const [screen, setScreen] = useState<"intro" | "analyzing" | "quiz" | "result">("intro");
  const [handle, setHandle] = useState("");
  const [igAnalysis, setIgAnalysis] = useState<IGAnalysis>({ score: 0, flags: [], stats: null });
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [quizScore, setQuizScore] = useState(0);

  const startAnalysis = useCallback(async (h: string) => {
    const clean = h.replace("@", "").trim();
    setHandle(clean);
    setScreen("analyzing");
    const data = await fetchInstagramData(clean);
    setIgAnalysis(analyzeInstagram(data));
    setTimeout(() => setScreen("quiz"), data ? 800 : 500);
  }, []);

  const handleAnswer = useCallback((option: QuestionOption) => {
    const newAnswers = [...answers, { id: questions[currentQ].id, ...option }];
    setAnswers(newAnswers);
    setQuizScore((s) => s + option.score);
    if (currentQ + 1 < questions.length) setCurrentQ((q) => q + 1);
    else setScreen("result");
  }, [answers, currentQ]);

  const handleReset = useCallback(() => {
    setScreen("intro");
    setHandle("");
    setIgAnalysis({ score: 0, flags: [], stats: null });
    setCurrentQ(0);
    setAnswers([]);
    setQuizScore(0);
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="w-full border-b border-white/[0.04] bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 lg:px-20 h-16">
          <a href="/" className="font-display text-lg font-extrabold tracking-tight">
            CONTENT<span className="text-accent">ENGINE</span>
          </a>
          <a href="/" className="text-sm text-muted hover:text-foreground transition-colors">← Terug</a>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className={`w-full max-w-[480px] border border-white/[0.04] rounded-2xl bg-white/[0.01] ${
          screen === "intro" ? "p-10 sm:p-12" : "p-8 sm:p-10"
        }`}>
          {screen === "intro" && <IntroScreen onStart={startAnalysis} />}
          {screen === "analyzing" && <AnalyzingScreen handle={handle} />}
          {screen === "quiz" && (
            <QuestionStep
              question={questions[currentQ]}
              onAnswer={handleAnswer}
              idx={currentQ}
              total={questions.length}
            />
          )}
          {screen === "result" && (
            <ResultScreen
              answers={answers}
              quizScore={quizScore}
              igAnalysis={igAnalysis}
              onReset={handleReset}
              handle={handle}
            />
          )}
        </div>
      </div>
    </main>
  );
}
