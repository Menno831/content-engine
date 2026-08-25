// Gedeeld door de kaart (client) en de pagina (server): de eerste
// bruikbare Instagram-handle uit een (rommelig) instagram-veld halen.
export function igHandle(v: string): string {
  const h = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "").trim();
  if (/^[\w.]+$/.test(h)) return h;
  // Handle met annotatie eromheen ("@naam (~108K)" of twee handles met +):
  // pak de eerste @handle uit de tekst. Vrije tekst zonder @ blijft verborgen.
  const m = v.match(/@([\w.]{2,30})/);
  return m ? m[1] : "";
}
