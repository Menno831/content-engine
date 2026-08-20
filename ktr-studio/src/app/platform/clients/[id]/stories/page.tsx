import Link from "next/link";
import { getStoryMonth } from "@/lib/workspace";
import { StoriesBoard } from "./StoriesBoard";

// Stories-tab: handmatige Instagram-stories per maand.
export default async function ClientStoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ maand?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = sp.maand && /^\d{4}-\d{2}$/.test(sp.maand) ? sp.maand : thisMonth;
  const data = await getStoryMonth(id, month);

  // Zes maanden terug om doorheen te klikken.
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-muted max-w-lg">
          Handmatige stories-tracking: per dag een reeks slides met views, drop-off en link-klikken — zo zie je precies
          bij welke slide mensen afhaken.
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {months.map((m) => (
            <Link
              key={m}
              href={m === thisMonth ? `/platform/clients/${id}/stories` : `/platform/clients/${id}/stories?maand=${m}`}
              className={`rounded-full px-3 py-1.5 text-[12px] transition-all ${
                m === month
                  ? "bg-accent text-background font-bold"
                  : "border border-white/[0.08] text-muted hover:border-accent/30 hover:text-accent"
              }`}
            >
              {new Date(`${m}-01`).toLocaleDateString("nl-NL", { month: "short" })}
            </Link>
          ))}
        </div>
      </div>

      <StoriesBoard clientId={id} month={month} initial={data} />
    </>
  );
}
