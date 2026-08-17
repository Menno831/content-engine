"use client";

// ════════════════════════════════════════════════════════════════
// Eén kaart op het productieboard. Klikken opent een dialoog waarin
// álle velden bewerkbaar zijn (titel, format, datums, links, briefing)
// en waar de kaart ook verwijderd kan worden. Detailvelden worden pas
// bij het openen opgehaald zodat het board zelf licht blijft.
// ════════════════════════════════════════════════════════════════

import { useActionState, useEffect, useState, useTransition } from "react";
import { Card, Badge, icons } from "../_components";
import { fmtNum, type ContentCard } from "../_data";
import { ContentStageControl } from "./ContentStageControl";
import {
  getContentDetailAction,
  updateContentAction,
  deleteContentAction,
  type ContentDetail,
  type ContentActionResult,
} from "./actions";

const FORMATS = ["Longform", "Clip", "Lifestyle", "VO story", "Talking", "Trio", "Carrousel", "Reel", "Story", "Short"];

interface Option {
  id: string;
  label: string;
}

export function ContentCardItem({
  card,
  color,
  editors,
  demo,
  isEditor,
}: {
  card: ContentCard;
  color: string;
  editors: Option[];
  demo: boolean;
  isEditor: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Bewust Engels: het board is er ook voor de editors — één taal.
  const t = { edit: "Edit card", files: "Open files" };

  return (
    <>
      <Card
        hover
        className="p-4 cursor-pointer"
        onClick={() => setOpen(true)}
        title={t.edit}
      >
        <div className="flex items-center justify-between mb-2.5">
          <Badge color={color}>{card.format}</Badge>
          <span className="font-mono text-[10px] text-muted">{card.due}</span>
        </div>
        <h3 className="font-medium text-sm leading-snug mb-2">{card.title}</h3>
        {card.hook && (
          <p className="text-[12px] text-muted leading-relaxed mb-3 line-clamp-2">
            &ldquo;{card.hook}&rdquo;
          </p>
        )}
        {card.briefUrl && (
          <a
            href={card.briefUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] hover:border-accent/40 hover:text-accent px-2.5 py-1 text-[11.5px] text-foreground/80 transition-all"
          >
            📁 {t.files}
          </a>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <span className="text-[11px] text-muted truncate max-w-[120px]">{card.client}</span>
          {card.stage === "posted" ? (
            <div className="flex items-center gap-2.5 text-[11px]">
              {card.permalink ? (
                <a
                  href={card.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-accent hover:text-accent-hover"
                  title="Open op het kanaal"
                >
                  <span className="w-3.5 h-3.5">{icons.eye}</span>
                  {fmtNum(card.views ?? 0)}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-muted">
                  <span className="w-3.5 h-3.5">{icons.eye}</span>
                  {fmtNum(card.views ?? 0)}
                </span>
              )}
              <span className="flex items-center gap-1 text-emerald-400">{card.leads ?? 0} leads</span>
            </div>
          ) : (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                card.assignee === "AI"
                  ? "bg-accent/15 text-accent border border-accent/25"
                  : "bg-white/[0.05] text-muted"
              }`}
            >
              {card.assignee === "AI" ? "✦ AI" : card.assignee}
            </span>
          )}
        </div>
        {!demo && (
          <div onClick={(e) => e.stopPropagation()}>
            <ContentStageControl contentId={card.id} stage={card.stage} />
          </div>
        )}
      </Card>

      {open && (
        <EditContentDialog
          contentId={card.id}
          editors={editors}
          isEditor={isEditor}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const initial: ContentActionResult = {};

function EditContentDialog({
  contentId,
  editors,
  isEditor,
  onClose,
}: {
  contentId: string;
  editors: Option[];
  isEditor: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(updateContentAction, initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Eén taal (Engels) voor iedereen — simpel en editors verstaan het.
  const t = {
    title: "Edit card",
    loading: "Loading…",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    del: "Delete card",
    delConfirm: "Really delete? This can't be undone",
    fTitle: "Title", fHook: "Hook (optional)", fFormat: "Format", fType: "Type",
    fDeadline: "Deadline", fLive: "Goes live on", fEditor: "Editor",
    fBrief: "Raw footage (Drive)", fFrame: "Delivery (Frame)", fVo: "Voice-over file",
    fRef: "Reference video", fNotes: "Extra notes",
  };

  useEffect(() => {
    let alive = true;
    getContentDetailAction(contentId).then((r) => {
      if (!alive) return;
      if (r.data) setDetail(r.data);
      else setLoadError(r.error ?? "Laden mislukt.");
    });
    return () => {
      alive = false;
    };
  }, [contentId]);

  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(onClose, 600);
      return () => clearTimeout(timer);
    }
  }, [state.ok, onClose]);

  function doDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const r = await deleteContentAction(contentId);
      if (r.error) setDeleteError(r.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-extrabold text-xl mb-4">{t.title}</h3>

        {loadError && <p className="text-[13px] text-red-400">{loadError}</p>}
        {!detail && !loadError && <p className="text-sm text-muted py-6 text-center">{t.loading}</p>}

        {detail && (
          <form action={action} className="space-y-3.5">
            <input type="hidden" name="content_id" value={detail.id} />
            <Field name="title" label={t.fTitle} defaultValue={detail.title} required />
            <Field name="hook" label={t.fHook} defaultValue={detail.hook} />
            <div className="grid grid-cols-2 gap-3">
              <Select
                name="format"
                label={t.fFormat}
                options={(FORMATS.includes(detail.format) ? FORMATS : [detail.format, ...FORMATS]).map((f) => ({ id: f, label: f }))}
                defaultValue={detail.format}
              />
              <Field name="content_type" label={t.fType} defaultValue={detail.content_type} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field name="deadline" label={t.fDeadline} type="date" defaultValue={detail.deadline} />
              <Field name="posting_date" label={t.fLive} type="date" defaultValue={detail.posting_date} />
            </div>
            <Select
              name="editor_id"
              label={t.fEditor}
              options={editors}
              defaultValue={detail.editor_id}
              placeholder="—"
            />
            <Field name="brief_url" label={t.fBrief} defaultValue={detail.brief_url} placeholder="https://drive.google.com/…" />
            <Field name="frame_url" label={t.fFrame} defaultValue={detail.frame_url} placeholder="https://f.io/…" />
            <Field name="vo_url" label={t.fVo} defaultValue={detail.vo_url} placeholder="https://…" />
            <Field name="reference_url" label={t.fRef} defaultValue={detail.reference_url} placeholder="https://…" />
            <label className="block">
              <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{t.fNotes}</span>
              <textarea
                name="footage_notes"
                defaultValue={detail.footage_notes}
                rows={3}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors resize-y"
              />
            </label>

            {state.error && <p className="text-[13px] text-red-400">{state.error}</p>}
            {state.ok && <p className="text-[13px] text-emerald-400">{state.ok}</p>}
            {deleteError && <p className="text-[13px] text-red-400">{deleteError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/[0.08] hover:border-white/20 py-2.5 text-sm transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-60 text-background font-bold text-sm py-2.5 transition-colors"
              >
                {pending ? t.saving : t.save}
              </button>
            </div>

            {!isEditor && (
              <button
                type="button"
                onClick={() => (confirmDelete ? doDelete() : setConfirmDelete(true))}
                disabled={deleting}
                className={`w-full rounded-xl border py-2 text-[13px] transition-colors ${
                  confirmDelete
                    ? "border-red-500/60 bg-red-500/10 text-red-400 font-bold"
                    : "border-white/[0.08] text-muted hover:border-red-500/40 hover:text-red-400"
                }`}
              >
                {deleting ? "…" : confirmDelete ? `⚠ ${t.delConfirm}` : `🗑 ${t.del}`}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm outline-none focus:border-accent/40"
      >
        {placeholder !== undefined && <option value="" className="bg-card">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
