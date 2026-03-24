"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Lenis from "lenis";

const CTA_URL = "/book";

/* ══════════════════════════════════════
   HOOKS
   ══════════════════════════════════════ */

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

/* ══════════════════════════════════════
   MAGNETIC CTA BUTTON
   ══════════════════════════════════════ */
function MagneticCTA({ className = "", size = "default" }: { className?: string; size?: "default" | "large" }) {
  const btnRef = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setOffset({ x: (e.clientX - cx) * 0.15, y: (e.clientY - cy) * 0.15 });
  }, []);

  const handleMouseLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const base = size === "large" ? "text-lg sm:text-xl px-12 py-5" : "text-base px-8 py-4";

  return (
    <a
      ref={btnRef}
      href={CTA_URL}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative inline-flex items-center gap-3 bg-accent hover:bg-accent-hover text-background font-bold rounded-xl transition-colors duration-300 animate-cta-glow active:scale-[0.97] ${base} ${className}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: offset.x === 0 ? "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s, background-color 0.3s" : "color 0.3s, background-color 0.3s",
      }}
    >
      <span>Plan een Strategiegesprek</span>
      <svg className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </a>
  );
}

/* ══════════════════════════════════════
   TEXT LINE REVEAL
   ══════════════════════════════════════ */
function RevealText({ children, className = "", delay = 0 }: { children: string; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.2);
  const lines = children.split("\n");
  return (
    <span ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <span
            className="block"
            style={{
              transform: inView ? "translateY(0) rotateX(0)" : "translateY(100%) rotateX(-10deg)",
              opacity: inView ? 1 : 0,
              filter: inView ? "blur(0)" : "blur(4px)",
              transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay + i * 0.1}s`,
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </span>
  );
}

/* ══════════════════════════════════════
   SECTION LABEL (animated line + text)
   ══════════════════════════════════════ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className="flex items-center gap-3 mb-4">
      <div className="h-px bg-accent" style={{ width: inView ? 32 : 0, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      <span className="font-mono text-sm tracking-[0.15em] text-accent uppercase" style={{ opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-10px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s" }}>
        {children}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════
   SECTION WRAPPER — REDUCED PADDING
   ══════════════════════════════════════ */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, inView } = useInView(0.08);
  return (
    <section ref={ref} id={id} className={`px-6 md:px-12 lg:px-20 py-10 md:py-12 ${className}`}>
      <div className={`max-w-6xl mx-auto ${inView ? "section-revealed" : ""}`}>{children}</div>
    </section>
  );
}

/* ══════════════════════════════════════
   STAGGER ITEM
   ══════════════════════════════════════ */
function StaggerItem({ children, index, className = "" }: { children: React.ReactNode; index: number; className?: string }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(30px)", filter: inView ? "blur(0)" : "blur(2px)", transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s` }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════
   NAV LINK
   ══════════════════════════════════════ */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm text-muted hover:text-foreground transition-colors duration-200">{children}</a>
  );
}

/* ══════════════════════════════════════
   PAGE
   ══════════════════════════════════════ */
export default function Home() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 2 });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const mouse = useMousePosition();

  return (
    <main className="overflow-x-hidden grid-bg">
      {/* ── AMBIENT ORBS ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] -left-[200px] w-[700px] h-[700px] bg-accent/[0.035] rounded-full blur-[180px] animate-drift" style={{ transform: `translate(${mouse.x * 0.01}px, ${mouse.y * 0.01}px)` }} />
        <div className="absolute top-[55%] -right-[150px] w-[500px] h-[500px] bg-accent/[0.025] rounded-full blur-[150px] animate-drift-slow" style={{ transform: `translate(${mouse.x * -0.008}px, ${mouse.y * -0.008}px)` }} />
      </div>

      {/* ── NAV — met sectie-links ── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-background/60 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 lg:px-20 h-16">
          <span className="font-display text-lg font-extrabold tracking-tight">
            CONTENT<span className="text-accent">ENGINE</span>
          </span>
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="#probleem">Probleem</NavLink>
            <NavLink href="#resultaten">Resultaten</NavLink>
            <NavLink href="#framework">Framework</NavLink>
            <NavLink href="#proces">Hoe het werkt</NavLink>
            <a href={CTA_URL} className="inline-flex items-center gap-2 bg-accent/10 hover:bg-accent text-accent hover:text-background border border-accent/20 hover:border-accent font-semibold text-sm px-5 py-2 rounded-lg transition-all duration-300">
              Gratis Gesprek
            </a>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════
         1. HERO — centered, max-w-7xl, capped font size
         ══════════════════════════════════════ */}
      <section className="relative min-h-[85vh] flex items-center px-6 md:px-12 lg:px-20 pt-20 pb-12 z-10">
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8">
            {/* Case study badge — linkt naar #resultaten */}
            <a href="#resultaten" className="animate-fade-in-up inline-flex items-center gap-3 bg-accent/[0.06] border border-accent/15 rounded-full px-5 py-2 mb-8 hover:bg-accent/[0.12] transition-colors cursor-pointer">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="font-mono text-xs tracking-wide text-accent/90">
                CASE STUDY: &euro;0 ADS &rarr; &euro;70K+ MRR IN 12 MAANDEN
              </span>
            </a>

            <h1 className="animate-fade-in-up animation-delay-200 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-[-0.03em]">
              Je concurrent
              <br />
              groeit sneller.
              <br />
              <span className="text-accent">
                Met een slechter
                <br />
                product.
              </span>
            </h1>

            <p className="animate-fade-in-up animation-delay-800 mt-6 text-base md:text-lg text-muted max-w-lg leading-relaxed">
              Het verschil? Zij hebben een contentsysteem. Jij niet.
              <br />
              <span className="text-foreground/80">Wij bouwen en runnen het voor je</span> &mdash; jij neemt 1x per maand op.
            </p>

            <div className="animate-fade-in-up animation-delay-1000 mt-8 flex flex-col sm:flex-row items-start gap-5">
              <MagneticCTA />
              <a
                href="/assessment"
                className="group inline-flex items-center gap-2.5 border border-white/[0.08] hover:border-accent/30 bg-transparent hover:bg-accent/[0.06] text-muted hover:text-accent font-semibold text-base px-7 py-4 rounded-xl transition-all duration-300 self-center"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                Gratis Reels-scan
              </a>
            </div>
            <div className="animate-fade-in-up animation-delay-1200 mt-5 flex items-center gap-2 text-sm text-muted">
              <span className="w-1 h-1 bg-muted/60 rounded-full" />
              <span>Max 6&ndash;8 klanten</span>
              <span className="w-1 h-1 bg-muted/60 rounded-full" />
              <span>Geen verplichtingen</span>
            </div>
          </div>

          {/* Stats — vertical, met context */}
          <div className="md:col-span-4 md:pl-8">
            <div className="animate-fade-in-up animation-delay-1200 space-y-6 md:border-l md:border-card-border/40 md:pl-8">
              <p className="font-mono text-xs tracking-wider text-muted uppercase">Onze case study</p>
              {[
                { value: "300+", label: "Betalende leden" },
                { value: "\u20AC70K+", label: "MRR bereikt" },
                { value: "\u20AC0", label: "Ad spend" },
                { value: "12 maanden", label: "Tijdlijn" },
              ].map((stat, i) => (
                <div key={stat.label} className="animate-slide-in-right" style={{ animationDelay: `${1.3 + i * 0.15}s` }}>
                  <div className="font-display text-3xl md:text-4xl font-extrabold text-accent stat-glow">{stat.value}</div>
                  <div className="font-mono text-xs tracking-wider text-muted uppercase mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         2. PROBLEM
         ══════════════════════════════════════ */}
      <Section id="probleem">
        <div className="grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5">
            <SectionLabel>Het probleem</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
              <RevealText>{"Elke maand zonder\ncontentsysteem"}</RevealText>
              <br />
              <span className="text-accent"><RevealText delay={0.3}>{"kost je geld."}</RevealText></span>
            </h2>
            <p className="mt-6 text-muted text-base leading-relaxed max-w-md">
              Niet &ldquo;minder bereik&rdquo;. Echte omzet. Leads die naar je
              concurrent gaan. Marktpositie die je nooit meer terugkrijgt.
            </p>
          </div>

          <div className="md:col-span-7 space-y-3">
            {[
              { n: "01", title: "Je weet dat je moet posten, maar het gebeurt niet", desc: "Elke week hetzelfde verhaal. Geen plan, geen systeem, geen output. Ondertussen loopt je concurrent weg." },
              { n: "02", title: "Freelancers inhuren die je merk niet snappen", desc: "Je betaalt een editor, maar het resultaat voelt niet als jij. Dus ga je toch weer zelf zitten editen." },
              { n: "03", title: "Concurrent domineert jouw niche", desc: "Ze hebben een slechter product maar betere content. En het werkt." },
              { n: "04", title: "6+ uur per week aan content terwijl je een bedrijf runt", desc: "Brainstormen, opnemen, editen, posten. Dat is geen CEO-werk. Dat is een fulltimebaan die je ervan afhoudt te doen waar je goed in bent." },
            ].map((item, i) => (
              <StaggerItem key={item.n} index={i} className="card-hover group flex gap-5 p-5 rounded-xl border border-card-border/60 bg-card/40 hover:bg-card hover:border-accent/20 cursor-default">
                <span className="font-mono text-sm text-accent/70 group-hover:text-accent transition-colors duration-500 mt-0.5 shrink-0">{item.n}</span>
                <div>
                  <h3 className="font-semibold text-base leading-snug">{item.title}</h3>
                  <p className="text-muted text-sm mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>

        {/* Quote — verbeterde attributie */}
        <div className="mt-12 relative p-8 md:p-10 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.07] via-accent/[0.03] to-transparent" />
          <div className="absolute inset-0 border border-accent/10 rounded-2xl" />
          <p className="relative font-display text-lg md:text-xl lg:text-2xl font-bold text-center leading-snug">
            &ldquo;Mijn concurrenten groeien sneller met slechtere producten
            <br className="hidden md:block" /> omdat zij content domineren.&rdquo;
          </p>
          <p className="relative text-center mt-4 text-sm text-muted">
            &mdash; Dit horen we in elke intake. Herkenbaar?{" "}
            <a href={CTA_URL} className="text-accent hover:underline">Laten we praten.</a>
          </p>
        </div>
      </Section>

      <div className="hr-gradient max-w-xl mx-auto" />

      {/* ══════════════════════════════════════
         3. SOLUTION
         ══════════════════════════════════════ */}
      <Section>
        <div className="max-w-3xl">
          <SectionLabel>De oplossing</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"Geen \u201Ccontent marketing\u201D."}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.2}>{"Een revenue-systeem."}</RevealText></span>
          </h2>
          <p className="mt-6 text-muted text-base leading-relaxed max-w-xl">
            Wij bouwen een volledig contentsysteem dat inbound leads genereert
            zonder ads. Strategie, planning, scripting, editing, publishing. Alles uit handen.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { icon: "\u2197", title: "Strategie als fundament", desc: "Geen random posts. Elk stuk content heeft een doel: bereik, autoriteit, of conversie. Gebouwd op data, niet op gevoel." },
            { icon: "\u25B6", title: "Volledige productie", desc: "Scripting, editing, thumbnails, captions, publishing. Jij neemt 1-2x per maand op. Wij doen de rest." },
            { icon: "\u20AC", title: "Gebouwd voor revenue", desc: "Wij optimaliseren op leads en omzet, niet op likes. Content is een business tool, geen hobby." },
          ].map((card, i) => (
            <StaggerItem key={card.title} index={i} className="gradient-border card-hover group p-7 rounded-2xl bg-card/60 backdrop-blur-sm">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-lg mb-5 group-hover:bg-accent/20 transition-all duration-500">{card.icon}</div>
              <h3 className="font-display text-lg font-bold mb-2">{card.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{card.desc}</p>
            </StaggerItem>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════
         AUDIT CTA — €500 prominenter
         ══════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20 pb-8">
        <div className="p-6 md:p-8 rounded-2xl border border-accent/20 bg-accent/[0.04] flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-bold">Niet zeker? Start met een &euro;500 audit.</h3>
            <p className="text-muted text-sm mt-1">Volledige analyse van je markt, concurrenten en contentkansen. Geen maandcontract, geen risico.</p>
          </div>
          <a href={CTA_URL} className="shrink-0 inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-background font-bold text-sm px-6 py-3 rounded-lg transition-colors">
            Plan een Audit Gesprek
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════
         PRICING INDICATIE
         ══════════════════════════════════════ */}
      <Section>
        <div className="max-w-3xl mb-8">
          <SectionLabel>Investering</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"Transparant."}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.15}>{"Geen verrassingen."}</RevealText></span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
          <StaggerItem index={0} className="gradient-border p-7 rounded-2xl bg-card/60">
            <span className="font-mono text-xs text-accent/70 uppercase tracking-wider">Instap</span>
            <h3 className="font-display text-2xl font-bold mt-2">&euro;500 <span className="text-muted text-base font-normal">eenmalig</span></h3>
            <p className="text-muted text-sm mt-3 leading-relaxed">Volledige audit van je markt, concurrenten en contentkansen. Je krijgt een concreet plan. Geen verplichtingen daarna.</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> Markt- en concurrentieanalyse</li>
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> Contentstrategie op maat</li>
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> Concrete aanbevelingen</li>
            </ul>
          </StaggerItem>

          <StaggerItem index={1} className="gradient-border p-7 rounded-2xl bg-card/60 border-accent/30">
            <span className="font-mono text-xs text-accent uppercase tracking-wider">Retainer</span>
            <h3 className="font-display text-2xl font-bold mt-2">Vanaf &euro;1.500 <span className="text-muted text-base font-normal">/maand</span></h3>
            <p className="text-muted text-sm mt-3 leading-relaxed">Volledig contentsysteem. Wij produceren, publiceren en optimaliseren. Jij neemt 1-2x per maand op.</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> 10-15+ Reels per maand</li>
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> Instagram, TikTok, LinkedIn</li>
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> Scripting, editing, publishing</li>
              <li className="flex items-center gap-2"><span className="text-accent">&#10003;</span> Maandelijkse rapportage</li>
            </ul>
          </StaggerItem>
        </div>
      </Section>

      <div className="hr-gradient max-w-xl mx-auto" />

      {/* ══════════════════════════════════════
         4. PROOF / CASE STUDY
         ══════════════════════════════════════ */}
      <Section id="resultaten" className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.015] to-transparent pointer-events-none" />

        <div className="relative max-w-3xl mb-12">
          <SectionLabel>Bewezen resultaten</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"Van 0 naar \u20AC70K+ MRR."}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.2}>{"Zonder \u00E9\u00E9n euro ads."}</RevealText></span>
          </h2>
        </div>

        <div className="relative grid md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-5 grid grid-cols-2 gap-4">
            {[
              { value: "300+", label: "Betalende leden" },
              { value: "\u20AC250/mo", label: "Per lid" },
              { value: "\u20AC70K+", label: "Maandelijkse omzet" },
              { value: "\u20AC0", label: "Ad spend" },
            ].map((stat) => (
              <div key={stat.label} className="card-hover p-5 rounded-2xl border border-card-border/60 bg-card/40 text-center">
                <div className="font-display text-3xl md:text-4xl font-extrabold text-accent stat-glow">
                  {stat.value}
                </div>
                <div className="font-mono text-xs tracking-wider text-muted uppercase mt-2">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="md:col-span-7 space-y-8 md:pl-6">
            {[
              { month: "Maand 0", title: "Nulmeting", desc: "Geen contentstrategie. Sporadisch posten. Geen inbound leads. Volledig afhankelijk van outbound.", active: false },
              { month: "Maand 1\u20133", title: "Fundament", desc: "Content Engine Framework ge\u00EFmplementeerd. Funnel-based strategie live. Eerste organische leads.", active: false },
              { month: "Maand 4\u20138", title: "Schaal", desc: "Consistente output. Content converteert betrouwbaar. 150+ betalende leden.", active: false },
              { month: "Maand 12", title: "\u20AC70K+ MRR", desc: "300+ betalende leden \u00E1 \u20AC250/maand. Volledig organisch. Inbound op autopilot.", active: true },
            ].map((item, i) => (
              <StaggerItem key={item.month} index={i} className="relative pl-8">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent/40 to-accent/10" />
                <div className={`absolute -left-[5px] top-1 w-[11px] h-[11px] rounded-full border-2 transition-shadow duration-500 ${item.active ? "bg-accent border-accent shadow-[0_0_16px_rgba(249,115,22,0.6)]" : "bg-background border-accent/40"}`} />
                <div className="font-mono text-xs tracking-widest text-accent/70 uppercase">{item.month}</div>
                <h3 className="font-display font-bold text-lg mt-1">{item.title}</h3>
                <p className="text-muted text-sm mt-1 leading-relaxed">{item.desc}</p>
              </StaggerItem>
            ))}
          </div>
        </div>
      </Section>

      <div className="hr-gradient max-w-xl mx-auto" />

      {/* ══════════════════════════════════════
         5. MECHANISM — Content Engine Framework
         ══════════════════════════════════════ */}
      <Section id="framework">
        <div className="max-w-3xl mb-8">
          <SectionLabel>Het framework</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"Het Content Engine"}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.2}>{"Raamwerk"}</RevealText></span>
          </h2>
          <p className="mt-6 text-muted text-base max-w-xl">
            90% van founders faalt met content omdat ze random posten. Wij gebruiken
            een funnel-based systeem waar elk stuk content een business-doel dient.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-4">
          {[
            { level: "TOP", title: "Bereik", desc: "Virale hooks, discovery content, pattern interrupts. Zorgt dat nieuwe mensen je vinden.", metrics: "Impressies \u00B7 Bereik \u00B7 Volgers" },
            { level: "MID", title: "Autoriteit", desc: "Educatie, diepgang, thought leadership. Bouwt vertrouwen en expertpositie op.", metrics: "Engagement \u00B7 Saves \u00B7 DMs" },
            { level: "BOTTOM", title: "Conversie", desc: "Social proof, case studies, DM funnels. Zet volgers om in betalende klanten.", metrics: "Leads \u00B7 Calls \u00B7 Omzet" },
          ].map((funnel, i) => (
            <StaggerItem key={funnel.level} index={i} className="relative p-7 rounded-2xl border border-card-border bg-card group hover:border-accent/30 transition-colors duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-accent rounded-t-2xl" />
              <span className="font-mono text-xs tracking-[0.2em] text-accent">{funnel.level} FUNNEL</span>
              <h3 className="font-display text-2xl font-extrabold mt-2">{funnel.title}</h3>
              <p className="text-foreground/80 text-sm mt-3 leading-relaxed">{funnel.desc}</p>
              <div className="mt-5 pt-3 border-t border-card-border">
                <span className="font-mono text-xs tracking-wider text-muted uppercase">KPI&apos;s: </span>
                <span className="text-sm text-foreground/90">{funnel.metrics}</span>
              </div>
            </StaggerItem>
          ))}
        </div>

        <p className="mt-10 font-display text-lg font-bold">
          Geen random posten. <span className="text-accent">Alleen strategie.</span>
        </p>
      </Section>

      {/* ══════════════════════════════════════
         6. PROCESS
         ══════════════════════════════════════ */}
      <Section id="proces">
        <div className="max-w-3xl mb-8">
          <SectionLabel>Hoe het werkt</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"3 stappen."}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.15}>{"Jij doet bijna niks."}</RevealText></span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { step: "01", title: "Kennismakingsgesprek", desc: "We analyseren je markt, doelgroep en concurrenten. Contentstrategie op maat die past bij jouw doelen.", detail: "45 min, geen pitch, puur strategie", link: CTA_URL },
            { step: "02", title: "Wij bouwen het systeem", desc: "Content planning, scripts, formats, funnels. Alles wordt opgezet. Jij keurt goed. Wij produceren.", detail: "Oplevering binnen 2 weken", link: undefined },
            { step: "03", title: "Jij neemt op, wij doen de rest", desc: "1-2x per maand content opnemen. Wij editen, publiceren, optimaliseren en rapporteren.", detail: "Volledig hands-off na opname", link: undefined },
          ].map((item, i) => (
            <StaggerItem key={item.step} index={i} className={`gradient-border card-hover group relative p-7 rounded-2xl bg-card/60 ${item.link ? "cursor-pointer" : ""}`}>
              {item.link ? (
                <a href={item.link} className="absolute inset-0 z-10" aria-label={item.title} />
              ) : null}
              <span className="font-display text-6xl font-black text-accent/[0.06] absolute top-3 right-5 select-none group-hover:text-accent/[0.15] transition-colors duration-700">{item.step}</span>
              <h3 className="font-display text-lg font-bold mb-3 relative">{item.title}{item.link ? <span className="text-accent text-sm font-normal ml-2">&rarr;</span> : null}</h3>
              <p className="text-muted text-sm leading-relaxed relative">{item.desc}</p>
              <div className="mt-4 pt-3 border-t border-card-border/30">
                <span className="font-mono text-xs text-accent/80 tracking-wide">{item.detail}</span>
              </div>
            </StaggerItem>
          ))}
        </div>
      </Section>

      <div className="hr-gradient max-w-xl mx-auto" />

      {/* ══════════════════════════════════════
         7. OBJECTIONS
         ══════════════════════════════════════ */}
      <Section>
        <div className="max-w-3xl mb-8">
          <SectionLabel>Eerlijk antwoord</SectionLabel>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"Je twijfelt."}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.15}>{"Terecht. Lees dit."}</RevealText></span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
          {[
            { q: "\u201CTe duur.\u201D", a: "Je verliest elke maand leads en marktpositie aan concurrenten die w\u00E9l investeren in content. Als content je 5 extra klanten per maand oplevert, is de ROI 10x+. Reken het uit." },
            { q: "\u201CIk heb al een editor geprobeerd.\u201D", a: "Een editor is geen systeem. Wij leveren geen edits, wij leveren een complete contentoperatie. Strategie, scripting, productie, publishing, optimalisatie. Het verschil tussen een freelancer en een machine." },
            { q: "\u201CIk kan het zelf.\u201D", a: "Kun je. Maar doe je het? Consistent? Op hoog niveau? Je tijd is \u20AC200\u2013500+/uur waard. Besteed het aan je core business, niet aan Reels editen." },
            { q: "\u201CWat als het niet werkt?\u201D", a: "Start met onze \u20AC500 audit implementatie. Geen maandcontract, geen risico. Je ziet precies wat we gaan doen v\u00F3\u00F3rdat je committed aan een retainer." },
          ].map((item, i) => (
            <StaggerItem key={item.q} index={i} className="card-hover p-7 rounded-2xl border border-card-border/60 bg-card/40 hover:bg-card">
              <h3 className="font-display text-lg font-bold text-accent mb-3">{item.q}</h3>
              <p className="text-muted text-sm leading-relaxed">{item.a}</p>
            </StaggerItem>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════
         8. AUTHORITY
         ══════════════════════════════════════ */}
      <Section>
        <div className="grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5">
            <SectionLabel>Waarom wij</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
              <RevealText>{"Geen bureau."}</RevealText>
              <br />
              <span className="text-accent"><RevealText delay={0.2}>{"Een founder\ndie bouwt."}</RevealText></span>
            </h2>
            <p className="mt-6 text-muted text-base leading-relaxed max-w-md">
              Dit is geen marketingbureau met account managers. Dit is een
              founder-led operatie die contentsystemen bouwt voor andere founders.
              Ik snap je business omdat ik er zelf een run.
            </p>

            {/* Founder identity */}
            <div className="mt-8 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center text-accent font-display font-bold text-lg">MK</div>
              <div>
                <p className="font-display font-bold">Menno Kater</p>
                <p className="text-muted text-sm">Founder, Content Engine</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <a href="https://instagram.com/menno.ktr" target="_blank" rel="noopener noreferrer" className="text-xs text-accent/70 hover:text-accent transition-colors">Instagram</a>
                  <a href="https://linkedin.com/in/mennokater" target="_blank" rel="noopener noreferrer" className="text-xs text-accent/70 hover:text-accent transition-colors">LinkedIn</a>
                  <a href="https://youtube.com/@mennokater" target="_blank" rel="noopener noreferrer" className="text-xs text-accent/70 hover:text-accent transition-colors">YouTube</a>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 md:pl-8 space-y-5">
            {[
              { title: "Snellere beslissingen, betere strategie", desc: "Geen junior account manager. Je werkt direct met een founder die dezelfde taal spreekt als jij." },
              { title: "Schaalbaar zonder jouw tijd", desc: "We bouwen een systeem dat draait \u00F3\u00F3k als wij stoppen. Geen afhankelijkheid, wel resultaat." },
              { title: "Omzet als maatstaf", desc: "We meten succes in leads en klanten, niet in likes en volgers. Elke euro moet terugkomen." },
              { title: "Exclusief: max 6\u20138 klanten", desc: "Zodat jouw bedrijf de aandacht krijgt die het verdient. Geen lopende band." },
            ].map((item, i) => (
              <StaggerItem key={item.title} index={i} className="flex gap-4 items-start group">
                <div className="relative mt-2 shrink-0">
                  <div className="w-2.5 h-2.5 bg-accent rounded-full group-hover:shadow-[0_0_16px_rgba(249,115,22,0.6)] transition-shadow duration-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">{item.title}</h3>
                  <p className="text-muted text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════
         9. FINAL CTA
         ══════════════════════════════════════ */}
      <section id="cta-final" className="relative px-6 md:px-12 lg:px-20 py-16 md:py-20 z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/[0.06] rounded-full blur-[180px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            <RevealText>{"Klaar om je concurrent"}</RevealText>
            <br />
            <span className="text-accent"><RevealText delay={0.15}>{"achter je te laten?"}</RevealText></span>
          </h2>
          <p className="mt-6 text-muted text-base max-w-lg mx-auto leading-relaxed">
            Elke maand dat je wacht, bouwt iemand anders de autoriteit op die
            jij had moeten hebben. We nemen maximaal 6&ndash;8 klanten aan.
          </p>

          <div className="mt-10">
            <MagneticCTA size="large" />
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
            {["Gratis kennismakingsgesprek", "Geen verplichtingen", "Start vanaf \u20AC500 audit"].map((item) => (
              <span key={item} className="flex items-center gap-2 font-mono text-xs tracking-wide text-muted">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-6 md:px-12 lg:px-20 py-12 z-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight">
                CONTENT<span className="text-accent">ENGINE</span>
              </span>
              <p className="text-muted text-sm mt-2 leading-relaxed">
                Contentsystemen die omzet genereren.<br />
                Voor founders die geen tijd hebben voor content.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm mb-3">Contact</h4>
              <div className="space-y-1.5 text-sm text-muted">
                <p>hallo@contentengine.nl</p>
                <p>Amsterdam, Nederland</p>
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm mb-3">Links</h4>
              <div className="space-y-1.5 text-sm text-muted">
                <a href="#" className="block hover:text-accent transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-accent transition-colors">Algemene Voorwaarden</a>
                <div className="flex gap-3 mt-3">
                  <a href="#" className="text-muted hover:text-accent transition-colors" aria-label="Instagram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                  <a href="#" className="text-muted hover:text-accent transition-colors" aria-label="LinkedIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </a>
                  <a href="#" className="text-muted hover:text-accent transition-colors" aria-label="TikTok">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04]">
            <span className="font-mono text-xs text-muted">&copy; 2026 Content Engine. Alle rechten voorbehouden.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
