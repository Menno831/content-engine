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
  title: "Content Engine | Contentsystemen die omzet genereren",
  description:
    "Volledig beheerde contentsystemen voor founders die €20K\u2013€200K+/maand draaien. Strategie, productie, publishing \u2014 wij doen alles. Jij neemt op. Wij bouwen je inbound machine.",
  openGraph: {
    title: "Content Engine | Stop met marktaandeel verliezen aan slechtere producten",
    description:
      "0 \u2192 300+ betalende leden. \u20AC70K+ MRR. \u20AC0 ad spend. Wij bouwen contentsystemen die omzet genereren.",
    type: "website",
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
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
