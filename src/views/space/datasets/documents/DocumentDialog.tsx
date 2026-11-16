import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getDocument, updateDocument } from "../../../../services/api";
import type { DatasetDocumentView } from "../../../../models";
import { Dialog } from "../Dialog";
import { confirmDeleteDocument } from "./deleteDocument";

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
  const [document, setDocument] = useState<DatasetDocumentView | null>(null);
  const [title, setTitle] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    setSaving(true);
    setError("");
    try {
      if (!(await confirmDeleteDocument(datasetName, documentId))) {
        setSaving(false);
        return;
      }
      onChanged();
      onClose();
    } catch (cause) {
      setError(messageOf(cause, "Unable to delete the document."));
      setSaving(false);
    }
  }

  return (
    <Dialog title="Document" onClose={onClose}>
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
    </Dialog>
  );
}
