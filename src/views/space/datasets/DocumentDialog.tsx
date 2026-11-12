import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { deleteDocument, getDocument, updateDocument } from "../../../services/api";
import type { DatasetDocumentView } from "../../../models";
import { useFocusTrap } from "../../../hooks/useFocusTrap";

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** One document of a managed dataset: its full text, rename, enable and delete. */
export function DocumentDialog({
  datasetName,
  documentId,
  onClose,
  onChanged,
}: {
  datasetName: string;
  documentId: string;
  onClose: () => void;
  /** After a save or delete, so the table reloads. */
  onChanged: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<DatasetDocumentView | null>(null);
  const [title, setTitle] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useFocusTrap(panel, onClose);

  useEffect(() => {
    const controller = new AbortController();
    getDocument(datasetName, documentId, { signal: controller.signal })
      .then((doc) => {
        setDocument(doc);
        setTitle(doc.title ?? "");
        setEnabled(doc.enabled);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageOf(cause, "Unable to load the document."));
      });
    return () => controller.abort();
  }, [datasetName, documentId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!document) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("A document needs a title.");
      return;
    }
    const changes = {
      ...(trimmed !== (document.title ?? "") && { title: trimmed }),
      ...(enabled !== document.enabled && { enabled }),
    };
    if (!Object.keys(changes).length) return onClose();
    setSaving(true);
    setError("");
    try {
      await updateDocument(datasetName, documentId, changes);
      onChanged();
      onClose();
    } catch (cause) {
      setError(messageOf(cause, "Unable to save the document."));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this document? To keep it but hide it from search, disable it."))
      return;
    setSaving(true);
    setError("");
    try {
      await deleteDocument(datasetName, documentId);
      onChanged();
      onClose();
    } catch (cause) {
      setError(messageOf(cause, "Unable to delete the document."));
      setSaving(false);
    }
  }

  return (
    <div className="tool-modal-overlay" onClick={onClose}>
      <div
        ref={panel}
        className="tool-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tool-modal-header">
          <h3 id={titleId}>Document</h3>
          <button type="button" className="btn-ghost btn-sm" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {!document && !error && <p role="status">Loading…</p>}
        {document && (
          <form onSubmit={handleSubmit}>
            <p className="tool-modal-desc">
              <code>{document.id}</code> · {document.source ?? "No source"} ·{" "}
              {document.acl.length ? document.acl.join(", ") : "Public"}
            </p>
            <div className="tool-field">
              <label htmlFor="document-dialog-title">Title</label>
              <input
                id="document-dialog-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <label className="datasets-detail__toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Enabled: search can return this document
            </label>
            <div className="tool-field">
              <span>Contents</span>
              <p className="datasets-detail__full-text">{document.contents ?? ""}</p>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-ghost btn-danger tools-catalog__delete"
                disabled={saving}
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            </div>
          </form>
        )}
        {!document && error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}
