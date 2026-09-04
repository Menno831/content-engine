// Google Ads. De koppeling vraagt meer dan een token: een developer token dat
// Google eerst moet goedkeuren, plus een OAuth-client met refresh-token. Zolang
// dat er niet is tonen we geen lege grafieken maar precies wat er nodig is.

import { Card } from "../_components";

export const isGoogleAdsConfigured = Boolean(
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
);

export function GoogleAdsCard() {
  if (isGoogleAdsConfigured) {
    return (
      <Card title="Google-advertenties">
        <p style={{ fontSize: 14 }}>
          Sleutels staan klaar. De rapportage wordt hier ingehangen zodra er uitgaven zijn om te tonen.
        </p>
      </Card>
    );
  }
  return (
    <Card title="Google-advertenties">
      <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>
        Nog niet gekoppeld. Google laat de advertentie-API pas toe na goedkeuring, dus dit kost een paar dagen
        en is geen kwestie van een sleutel plakken. Nodig:
      </p>
      <ul style={{ fontSize: 14, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
        <li>Een developer token aanvragen in een Google Ads manager-account (goedkeuring duurt dagen).</li>
        <li>Een OAuth-client in Google Cloud, en daarmee eenmalig een refresh-token ophalen.</li>
        <li>
          Daarna <code>GOOGLE_ADS_DEVELOPER_TOKEN</code>, <code>GOOGLE_ADS_CUSTOMER_ID</code> en{" "}
          <code>GOOGLE_ADS_REFRESH_TOKEN</code> in Vercel.
        </li>
      </ul>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: 12 }}>
        Draai je nog niets op Google, dan is dit ook geen haast. Het meetgedeelte staat al wel live op de site.
      </p>
    </Card>
  );
}
