import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createDataset, deleteDataset, updateDataset } from "../../../services/api";
import type { DatasetView } from "../../../models";
import { useFocusTrap } from "../../../hooks/useFocusTrap";

export type DatasetDialogMode = { kind: "create" } | { kind: "edit"; dataset: DatasetView };

// Mirrors the backend's rule: the name is the corpus key and a file name.
const NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** Create a dataset, or edit one (its name is fixed) and delete it. */
export function DatasetDialog({
  mode,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: DatasetDialogMode;
  onClose: () => void;
  onSaved: (dataset: DatasetView) => void;
  onDeleted?: () => void;
}) {
  const editing = mode.kind === "edit" ? mode.dataset : null;
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [domain, setDomain] = useState(editing?.domain ?? "");
  // The stored label; the view falls back to the name when it is unset.
  const [source, setSource] = useState(
    editing && editing.source !== editing.name ? editing.source : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useFocusTrap(panel, onClose);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editing && !NAME_PATTERN.test(name)) {
      setError(
        "Use lowercase letters, digits, - and _, starting with a letter or digit (64 at most).",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { description: description.trim(), domain, source };
      onSaved(
        editing ? await updateDataset(editing.name, body) : await createDataset({ name, ...body }),
      );
    } catch (cause) {
      setError(messageOf(cause, "Unable to save the dataset."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (
      !window.confirm(
        `Delete the dataset "${editing.name}"? Its documents leave search. ` +
          "An imported corpus goes back to its original file.",
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      await deleteDataset(editing.name);
      onDeleted?.();
    } catch (cause) {
      setError(messageOf(cause, "Unable to delete the dataset."));
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
          <h3 id={titleId}>{editing ? "Edit dataset" : "Create dataset"}</h3>
          <button type="button" className="btn-ghost btn-sm" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="tool-field">
            <label htmlFor="dataset-dialog-name">Name</label>
            <input
              id="dataset-dialog-name"
              type="text"
              value={name}
              disabled={!!editing}
              autoFocus={!editing}
              placeholder="team-docs"
              onChange={(event) => setName(event.target.value)}
            />
            <span className="tool-field-desc">
              {editing
                ? "The name is the corpus key search uses, so it cannot change."
                : "The corpus key search uses (--corpus); it cannot change later."}
            </span>
          </div>
          <div className="tool-field">
            <label htmlFor="dataset-dialog-description">Description</label>
            <textarea
              id="dataset-dialog-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="dataset-dialog-source">Source label</label>
            <input
              id="dataset-dialog-source"
              type="text"
              value={source}
              placeholder={editing?.name ?? name}
              onChange={(event) => setSource(event.target.value)}
            />
            <span className="tool-field-desc">
              What search results from this dataset cite; the name when blank.
            </span>
          </div>
          <div className="tool-field">
            <label htmlFor="dataset-dialog-domain">Domain</label>
            <input
              id="dataset-dialog-domain"
              type="text"
              value={domain}
              placeholder="retrieval/ML"
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {editing && (
              <button
                type="button"
                className="btn-ghost btn-danger tools-catalog__delete"
                disabled={saving}
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
