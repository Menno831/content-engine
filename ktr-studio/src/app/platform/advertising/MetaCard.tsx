"use client";

// Meta-koppeling op de advertentiepagina. Zonder sleutels: precies de
// stappen om ze te halen en waar ze heen moeten. Met sleutels: één knop om
// de koppeling te testen en één om direct 30 dagen op te halen, zodat je
// niet op de cron van 05:00 hoeft te wachten.

import { useState, useTransition } from "react";
import { Card, Eyebrow } from "../_components";
import { testMetaAction, syncMetaAction } from "./actions";
import type { MetaTest } from "@/lib/metaAds";

export interface MetaState {
  configured: boolean;
  entries: number;      // Meta-regels in ad_entries
  lastDate: string | null;
}

const VERCEL_ENV_URL = "https://vercel.com/dashboard";
const META_SYSTEM_USERS = "https://business.facebook.com/settings/system-users";
const META_ADS_MANAGER = "https://adsmanager.facebook.com/adsmanager/manage/campaigns";

export function MetaCard({ state }: { state: MetaState }) {
  const [test, setTest] = useState<MetaTest | null>(null);
  const [sync, setSync] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);
  const [pending, start] = useTransition();

  const btn = "rounded-lg border border-white/[0.08] hover:border-accent/30 hover:text-accent px-3 py-1.5 text-[12.5px] text-muted transition-all disabled:opacity-50";
  const primary = "rounded-lg bg-accent hover:bg-accent-hover text-background font-bold px-3 py-1.5 text-[12.5px] transition-colors disabled:opacity-50";

  if (!state.configured) {
    return (
      <Card className="p-5 mb-5 border-dashed border-accent/25">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <Eyebrow>Meta Ads</Eyebrow>
            <h2 className="font-display font-extrabold text-lg">Koppeling klaarzetten — twee waarden in Vercel</h2>
          </div>
          <a href={VERCEL_ENV_URL} target="_blank" rel="noreferrer" className={primary}>Open Vercel →</a>
        </div>
        <p className="text-[13px] text-muted mb-3">
          Alles staat klaar: de import, de grafieken en de AI-analyse. Zodra deze twee waarden in Vercel staan
          vult de pagina zichzelf elke ochtend om 07:00 (en direct via de knop <em>Sync nu</em>).
        </p>
        <ol className="space-y-2 text-[13px] list-decimal list-inside">
          <li>
            <strong>Token</strong> — ga naar{" "}
            <a href={META_SYSTEM_USERS} target="_blank" rel="noreferrer" className="text-accent hover:underline">Meta Business → Instellingen → Systeemgebruikers</a>.
            Maak een systeemgebruiker (rol Beheerder), geef die toegang tot je advertentieaccount, klik <em>Token genereren</em>,
            kies rechten <code className="text-accent">ads_read</code> + <code className="text-accent">ads_management</code>, vervaldatum <em>Nooit</em>.
          </li>
          <li>
            <strong>Account-id</strong> — open{" "}
            <a href={META_ADS_MANAGER} target="_blank" rel="noreferrer" className="text-accent hover:underline">Ads Manager</a>;
            in de URL staat <code className="text-accent">act=1234567890</code>. Dat nummer is het id (met of zonder <code>act_</code> ervoor).
          </li>
          <li>
            In Vercel → project <em>content-engine-kr5c</em> → Settings → Environment Variables, voor <em>Production</em>:
            <div className="mt-1.5 rounded-lg bg-black/30 border border-white/[0.06] px-3 py-2 font-mono text-[12px]">
              META_ADS_TOKEN = &lt;token&gt;<br />
              META_AD_ACCOUNT_ID = &lt;nummer&gt;
            </div>
          </li>
          <li>Klik in Vercel op <em>Redeploy</em> (Deployments → laatste → Redeploy). Daarna verschijnt hier de testknop.</li>
        </ol>
        <p className="text-[12px] text-muted mt-3">Plak de token nooit in een chat of in code — alleen in Vercel.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Meta Ads</Eyebrow>
          <h2 className="font-display font-extrabold text-lg">Gekoppeld</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            {state.entries
              ? `${state.entries} regels uit Meta · laatste dag ${state.lastDate ? new Date(state.lastDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "—"} · dagelijks om 07:00 opnieuw`
              : "Sleutels staan klaar, nog niets opgehaald — klik Sync nu."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={pending}
            onClick={() => { setTest(null); start(async () => setTest(await testMetaAction())); }}
            className={btn}
          >
            Test koppeling
          </button>
          <button
            disabled={pending}
            onClick={() => { setSync(null); start(async () => setSync(await syncMetaAction(30))); }}
            className={primary}
          >
            {pending ? "Bezig…" : "Sync nu (30 dagen)"}
          </button>
        </div>
      </div>
      {test && (
        <p className={`text-[13px] mt-3 ${test.ok ? "text-emerald-400" : "text-red-400"}`}>
          {test.ok ? `✓ Verbonden met "${test.accountName}" (${test.currency}, ${test.status})` : `✗ ${test.error}`}
        </p>
      )}
      {sync && (
        <p className={`text-[13px] mt-2 ${sync.error ? "text-red-400" : "text-emerald-400"}`}>{sync.error ?? `✓ ${sync.message}`}</p>
      )}
    </Card>
  );
}
