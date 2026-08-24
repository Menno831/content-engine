// Eén definitie van "vandaag" voor het hele platform: LOKALE datum
// (Nederland), als YYYY-MM-DD. Niet toISOString() gebruiken — dat is
// UTC en zit tussen 00:00 en 02:00 NL-tijd nog op gisteren, waardoor
// deadlines op twee plekken een andere status kregen.
export function todayStr(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("sv-SE");
}
