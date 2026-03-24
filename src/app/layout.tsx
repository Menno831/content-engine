import type { Metadata } from "next";
import { Inter, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Content Engine | Video Content Systemen voor Founders",
  description:
    "Wij bouwen en runnen je complete contentsysteem. Strategie, scripting, editing, publishing. Jij neemt 1x per maand op, wij doen de rest. Voor founders die hun personal brand willen laten groeien zonder er tijd aan kwijt te zijn.",
  keywords: [
    "contentsysteem founders",
    "video content bureau",
    "reels strategie",
    "personal branding founder",
    "instagram content systeem",
    "video marketing ondernemer",
    "content productie uitbesteden",
    "inbound leadgeneratie content",
    "talking head reels",
    "content engine",
  ],
  openGraph: {
    title: "Content Engine | Video Content Systemen voor Founders",
    description:
      "Van 0 naar 300+ betalende leden. Zonder ads. Wij bouwen contentsystemen die omzet genereren voor founders.",
    type: "website",
    locale: "nl_NL",
    siteName: "Content Engine",
  },
  twitter: {
    card: "summary_large_image",
    title: "Content Engine | Video Content Systemen",
    description: "Contentsystemen die omzet genereren. Voor founders die geen tijd hebben voor content.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://contentengine.digital",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${inter.variable} ${syne.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              name: "Content Engine",
              description: "Video content systemen voor founders en ondernemers",
              url: "https://contentengine.digital",
              founder: {
                "@type": "Person",
                name: "Menno Kater",
                jobTitle: "Founder",
              },
              areaServed: "NL",
              serviceType: "Video Content Productie",
              priceRange: "$$",
              sameAs: [
                "https://instagram.com/menno.ktr",
                "https://linkedin.com/in/mennokater",
                "https://youtube.com/@mennokater",
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
