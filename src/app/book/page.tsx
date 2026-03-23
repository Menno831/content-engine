"use client";

import { useState } from "react";

export default function BookPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);

    // TODO: Vervang dit met een echte API route (/api/book) of Cal.com embed
    // Voor nu: mailto fallback
    const subject = encodeURIComponent(`Strategy Call aanvraag — ${form.company || form.name}`);
    const body = encodeURIComponent(
      `Naam: ${form.name}\nEmail: ${form.email}\nBedrijf: ${form.company}\n\nBericht:\n${form.message}`
    );
    window.location.href = `mailto:hallo@contentengine.nl?subject=${subject}&body=${body}`;

    // Toon bevestiging na korte delay
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 1000);
  }

  return (
    <main className="min-h-screen grid-bg px-6 md:px-12 lg:px-20 pt-24 pb-16">
      {/* Nav — terug naar home */}
      <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-background/60 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-12 lg:px-20 h-16">
          <a href="/" className="font-display text-lg font-extrabold tracking-tight">
            CONTENT<span className="text-accent">ENGINE</span>
          </a>
          <a href="/" className="text-sm text-muted hover:text-foreground transition-colors">&larr; Terug</a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto grid md:grid-cols-12 gap-12 items-start pt-8">
        {/* Left — info */}
        <div className="md:col-span-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-accent" />
            <span className="font-mono text-sm tracking-[0.15em] text-accent uppercase">Gratis gesprek</span>
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[0.95] tracking-tight">
            Plan je gratis
            <br />
            <span className="text-accent">Strategy Call</span>
          </h1>

          <p className="mt-6 text-muted text-base leading-relaxed">
            45 minuten. Geen pitch. We analyseren je situatie, bekijken je markt en concurrenten,
            en laten zien hoe een contentsysteem er voor jou uit zou zien.
          </p>

          <div className="mt-8 space-y-4">
            <h3 className="font-display font-bold text-sm">Wat je kunt verwachten:</h3>
            {[
              "Analyse van je huidige contentpositie vs. concurrenten",
              "Concreet voorstel voor een contentstrategie op maat",
              "Eerlijk advies \u2014 ook als we niet de juiste fit zijn",
            ].map((item) => (
              <div key={item} className="flex gap-3 items-start">
                <svg className="w-4 h-4 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-sm text-foreground/90">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-5 rounded-xl border border-card-border bg-card/40">
            <div className="flex items-center gap-3">
              <div className="font-display text-2xl font-extrabold text-accent stat-glow">\u20AC70K+</div>
              <div className="text-sm text-muted">MRR bereikt voor onze case study \u2014 volledig organisch</div>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted">
            Geen verplichtingen. Geen verborgen kosten.
            <br />
            Wil je liever direct mailen? <a href="mailto:hallo@contentengine.nl" className="text-accent hover:underline">hallo@contentengine.nl</a>
          </p>
        </div>

        {/* Right — form */}
        <div className="md:col-span-7">
          {submitted ? (
            <div className="p-10 rounded-2xl border border-accent/20 bg-accent/[0.04] text-center">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold">Je mailclient opent nu</h2>
              <p className="text-muted mt-2">
                Stuur de email en we nemen binnen 24 uur contact op om een moment te plannen.
              </p>
              <a href="/" className="inline-block mt-6 text-accent hover:underline text-sm">&larr; Terug naar homepage</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 rounded-2xl border border-card-border bg-card/60 space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1.5">Naam *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Je volledige naam"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-card-border text-foreground placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="naam@bedrijf.nl"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-card-border text-foreground placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium mb-1.5">Bedrijf / Website</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="bedrijfsnaam.nl"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-card-border text-foreground placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1.5">Vertel kort over je situatie</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Wat voor bedrijf run je? Wat is je grootste uitdaging met content?"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-card-border text-foreground placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-3 bg-accent hover:bg-accent-hover text-background font-bold text-lg px-8 py-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Bezig..." : "Plan mijn Strategy Call"}
                {!sending && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </button>

              <p className="text-center text-xs text-muted">
                We reageren binnen 24 uur. Geen spam, geen nieuwsbrieven.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
