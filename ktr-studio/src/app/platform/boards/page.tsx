import { PageHeader } from "../_components";
import { getCaptures } from "@/lib/captures";
import { NoData } from "../_states";
import { AddCaptureDialog } from "./AddCaptureDialog";
import { BoardsExplorer } from "./BoardsExplorer";

export default async function BoardsPage() {
  const captures = await getCaptures();
  const boards = [...new Set(captures.map((c) => c.board))];

  return (
    <>
      <PageHeader
        eyebrow="Second brain"
        title="Alles wat je weet, op één plek"
        subtitle="Drop links, YouTube-video's, documenten en ideeën. Vink in de Studio 'Second brain meenemen' aan en de AI gebruikt dit als context voor killer scripts."
        action={<AddCaptureDialog boards={boards} />}
      />

      {captures.length === 0 ? (
        <NoData label="Nog niks bewaard — voeg je eerste item toe" />
      ) : (
        <BoardsExplorer captures={captures} />
      )}
    </>
  );
}
