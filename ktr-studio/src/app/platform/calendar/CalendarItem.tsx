"use client";

// Eén content-chip op de kalender. Voor owner/team klikbaar: opent
// dezelfde bewerkdialoog als op het productieboord (datum verzetten,
// links aanpassen, verwijderen). Klant-logins zien alleen de chip.
import { useState } from "react";
import { EditContentDialog } from "../pipeline/ContentCardItem";

export function CalendarItem({
  contentId,
  title,
  color,
  tooltip,
  editable,
  editors,
}: {
  contentId: string;
  title: string;
  color: string;
  tooltip: string;
  editable: boolean;
  editors: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={editable ? () => setOpen(true) : undefined}
        className={`rounded px-1.5 py-0.5 text-[10px] leading-tight truncate ${editable ? "cursor-pointer hover:brightness-125" : ""}`}
        style={{ background: `${color}22`, color }}
        title={tooltip}
      >
        {title}
      </div>
      {open && (
        <EditContentDialog contentId={contentId} editors={editors} isEditor={false} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
