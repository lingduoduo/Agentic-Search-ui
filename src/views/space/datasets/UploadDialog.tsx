import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createDocuments } from "../../../services/api";
import type { DocumentBatchView } from "../../../models";
import { useDocumentBatch } from "../../../hooks/useDataset";
import { useFocusTrap } from "../../../hooks/useFocusTrap";

// Mirrors the backend's limits, so a bad pick is caught before uploading.
const EXTENSIONS = [".jsonl", ".txt", ".md"];
export const MAX_FILES = 20;
export const MAX_BYTES = 10 * 1024 * 1024;

const STATUS_LABELS = {
  waiting: "Waiting",
  parsing: "Processing",
  completed: "Added",
  error: "Failed",
} as const;

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** What is wrong with a selection, or "" when it can be uploaded. */
export function checkFiles(files: File[]): string {
  if (!files.length) return "Choose at least one file.";
  if (files.length > MAX_FILES) return `Upload at most ${MAX_FILES} files at a time.`;
  for (const file of files) {
    const dot = file.name.lastIndexOf(".");
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
    if (!EXTENSIONS.includes(ext)) return `${file.name}: use .jsonl, .txt or .md files.`;
    if (file.size > MAX_BYTES) return `${file.name} is over the 10 MB limit.`;
  }
  return "";
}

/** Upload files to a managed dataset and follow each file until it is processed. */
export function UploadDialog({
  datasetName,
  onClose,
  onUploaded,
}: {
  datasetName: string;
  onClose: () => void;
  /** Once every file is processed, so the table reloads. */
  onUploaded: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<DocumentBatchView | null>(null);
  useFocusTrap(panel, onClose);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = checkFiles(files);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    setError("");
    try {
      setAccepted(await createDocuments(datasetName, files));
    } catch (cause) {
      setError(messageOf(cause, "Unable to upload the files."));
    } finally {
      setUploading(false);
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
          <h3 id={titleId}>Add documents</h3>
          <button type="button" className="btn-ghost btn-sm" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {accepted ? (
          <BatchProgress datasetName={datasetName} accepted={accepted} onDone={onUploaded}>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </BatchProgress>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="upload-dialog-files">Files</label>
              <input
                id="upload-dialog-files"
                type="file"
                multiple
                accept={EXTENSIONS.join(",")}
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []));
                  setError("");
                }}
              />
              <span className="tool-field-desc">
                .jsonl: one document per line with contents (or text), and optional id, title and
                metadata. .txt and .md: split into passages of about 300 words. Up to {MAX_FILES}{" "}
                files, 10 MB each.
              </span>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function BatchProgress({
  datasetName,
  accepted,
  onDone,
  children,
}: {
  datasetName: string;
  accepted: DocumentBatchView;
  onDone: () => void;
  children: ReactNode;
}) {
  const { batch, error } = useDocumentBatch(datasetName, accepted);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (batch.done) doneRef.current();
  }, [batch.done]);
  const added = batch.files.reduce((sum, file) => sum + file.document_count, 0);

  return (
    <div>
      <ul className="datasets-upload__files" aria-label="Upload progress">
        {batch.files.map((file, index) => (
          <li key={`${file.filename}-${index}`} data-status={file.status}>
            <span>{file.filename}</span>
            <span>
              {STATUS_LABELS[file.status] ?? file.status}
              {file.status === "completed" &&
                ` · ${file.document_count} document${file.document_count === 1 ? "" : "s"}`}
            </span>
            {file.error && <small>{file.error}</small>}
          </li>
        ))}
      </ul>
      <p role="status" className="datasets-detail__note">
        {batch.done
          ? `Done: ${added} document${added === 1 ? "" : "s"} added.`
          : "Processing the files…"}
      </p>
      {error && <p className="form-error">{error}</p>}
      {children}
    </div>
  );
}
