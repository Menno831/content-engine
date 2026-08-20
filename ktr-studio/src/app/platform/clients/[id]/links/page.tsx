import { getClientLinks } from "@/lib/workspace";
import { LinksBoard } from "./LinksBoard";

// Links-tab: alle vaste links van deze klant bij elkaar.
export default async function ClientLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const links = await getClientLinks(id);
  return (
    <>
      <p className="text-[13px] text-muted mb-5">
        Alles wat je steeds moet opzoeken: footage-mappen, merkbestanden, Frame-projecten, tools.
      </p>
      <LinksBoard clientId={id} initial={links} />
    </>
  );
}
