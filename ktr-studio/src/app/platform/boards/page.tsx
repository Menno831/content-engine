import { PageHeader, Card, Badge, icons } from "../_components";
import { getCaptures } from "@/lib/captures";
import { NoData } from "../_states";
import { AddCaptureDialog } from "./AddCaptureDialog";

const kindMeta: Record<string, { label: string; color: string }> = {
  link: { label: "Link", color: "#60A5FA" },
  note: { label: "Notitie", color: "#FBBF24" },
  idea: { label: "Idee", color: "#A78BFA" },
  swipe: { label: "Swipe", color: "#34D399" },
};

export default async function BoardsPage() {
  const captures = await getCaptures();
  const boards = [...new Set(captures.map((c) => c.board))];

  return (
    <>
      <PageHeader
        eyebrow="Boards"
        title="Je second brain"
        subtitle="Bewaar links, notities, ideeën en inspiratie op boards — alles op één plek, klaar om in content om te zetten."
        action={<AddCaptureDialog boards={boards} />}
      />

      {captures.length === 0 ? (
        <NoData label="Nog niks bewaard — voeg je eerste item toe" />
      ) : (
        <div className="space-y-8">
          {boards.map((board) => {
            const items = captures.filter((c) => c.board === board);
            return (
              <div key={board}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid place-items-center w-6 h-6 rounded-md bg-white/[0.05] text-muted">{icons.dashboard}</span>
                  <h2 className="font-display font-bold">{board}</h2>
                  <span className="font-mono text-[11px] text-muted">{items.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map((c) => {
                    const k = kindMeta[c.kind] ?? kindMeta.link;
                    return (
                      <Card key={c.id} hover className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge color={k.color}>{k.label}</Badge>
                          {c.source && <span className="text-[11px] text-muted">{c.source}</span>}
                        </div>
                        <h3 className="font-medium text-sm leading-snug mb-1.5">{c.title}</h3>
                        {c.body && <p className="text-[12px] text-muted leading-relaxed line-clamp-3">{c.body}</p>}
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-accent hover:text-accent-hover">
                            Open ↗
                          </a>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
