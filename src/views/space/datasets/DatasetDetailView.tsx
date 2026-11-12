import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useDataset, useDatasetDocuments } from "../../../hooks/useDataset";
import { useKeywordSearch } from "../../../hooks/useKeywordSearch";
import { routePath } from "../../../config/routes";
import { importDataset, updateDocument } from "../../../services/api";
import type { DatasetDocumentView } from "../../../models";
import { DatasetBadges, DatasetHeading } from "./DatasetsView";
import { DatasetDialog } from "./DatasetDialog";
import { DocumentDialog } from "./DocumentDialog";
import { SearchTestPanel } from "./SearchTestPanel";
import { UploadDialog } from "./UploadDialog";

// A new search starts again from the first page.
const SEARCH_RESETS = ["current_page"] as const;

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** `/space/datasets/:name`: one corpus and its documents, a table page at a time. */
export function DatasetDetailView() {
  const name = useParams().name ?? "";
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const searchWord = params.get("search_word") ?? "";
  const requested = Number(params.get("current_page"));
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const { query, setQuery, commitKeyword } = useKeywordSearch(SEARCH_RESETS);
  const { dataset, error: datasetError, reload: reloadDataset } = useDataset(name);
  const { documents, paginator, loading, error, reload } = useDatasetDocuments(
    name,
    page,
    searchWord,
  );
  const [editing, setEditing] = useState(false);
  const [openDocument, setOpenDocument] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Documents whose enabled switch is saving.
  const [toggling, setToggling] = useState<ReadonlySet<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [actionError, setActionError] = useState("");
  const totalPages = paginator?.total_page ?? 0;
  const managed = dataset?.managed ?? false;

  const goTo = (next: number) => {
    const nextParams = new URLSearchParams(params);
    if (next > 1) nextParams.set("current_page", String(next));
    else nextParams.delete("current_page");
    setParams(nextParams);
  };

  const changed = () => {
    reload();
    reloadDataset();
  };

  async function handleImport() {
    setImporting(true);
    setActionError("");
    try {
      await importDataset(name);
      changed();
    } catch (cause) {
      setActionError(messageOf(cause, "Unable to import the dataset."));
    } finally {
      setImporting(false);
    }
  }

  async function toggle(doc: DatasetDocumentView) {
    const id = doc.document_id;
    if (!id) return;
    setToggling((ids) => new Set(ids).add(id));
    setActionError("");
    try {
      await updateDocument(name, id, { enabled: !doc.enabled });
      changed();
    } catch (cause) {
      setActionError(messageOf(cause, "Unable to update the document."));
    } finally {
      setToggling((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <section className="datasets-detail" aria-label={`Dataset ${name}`}>
      <Link className="datasets-detail__back" to={routePath("space-datasets")}>
        ← All datasets
      </Link>

      {datasetError && (
        <div className="error-banner" role="alert">
          <span>{datasetError}</span>
          <button
            type="button"
            className="account-retry"
            aria-label="Retry loading the dataset"
            onClick={reloadDataset}
          >
            Retry
          </button>
        </div>
      )}
      {dataset && (
        <div className="source-card datasets-detail__summary">
          <DatasetHeading dataset={dataset} />
          {dataset.description && (
            <span className="source-card__description">{dataset.description}</span>
          )}
          <code className="datasets-catalog__path">{dataset.path ?? "No path"}</code>
          <DatasetBadges dataset={dataset} />
          <div className="datasets-detail__actions">
            {managed ? (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
                Edit dataset
              </button>
            ) : (
              <>
                <span>Import this corpus to edit it; its file stays as it is.</span>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={importing || !dataset.available}
                  onClick={() => void handleImport()}
                >
                  {importing ? "Importing…" : "Import to manage"}
                </button>
              </>
            )}
            {dataset.updated_at && (
              <small>Updated {new Date(dataset.updated_at).toLocaleString()}</small>
            )}
          </div>
          {managed && dataset.served !== true && (
            <p className="datasets-detail__note" role="note">
              Search sees changes after the retrieval server restarts with this corpus.
            </p>
          )}
        </div>
      )}
      {actionError && (
        <div className="error-banner" role="alert">
          <span>{actionError}</span>
        </div>
      )}

      {dataset?.available && <SearchTestPanel datasetName={name} />}

      <div className="sources-catalog__toolbar">
        <h3>Documents</h3>
        {managed && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setUploading(true)}>
            Add documents
          </button>
        )}
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            commitKeyword(query);
          }}
        >
          <input
            type="search"
            aria-label="Find a document"
            placeholder="Find a document…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="account-retry"
            aria-label="Retry loading documents"
            onClick={reload}
          >
            Retry
          </button>
        </div>
      )}
      {loading && <p role="status">Loading documents…</p>}

      {!loading && !error && documents.length === 0 && (
        <p className="sources-catalog__empty">
          {searchWord ? "No documents match." : "This dataset has no documents."}
        </p>
      )}
      {documents.length > 0 && (
        <table className="qh-table datasets-detail__table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Title</th>
              <th scope="col">Contents</th>
              <th scope="col">Source</th>
              <th scope="col">Access</th>
              {managed && <th scope="col">Enabled</th>}
              {managed && <th scope="col" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr
                key={doc.document_id ?? doc.id ?? `row-${index}`}
                className={doc.enabled ? undefined : "datasets-detail__row--disabled"}
              >
                <td>
                  <code>{doc.id ?? "—"}</code>
                </td>
                <td>{doc.title ?? "Untitled"}</td>
                <td className="datasets-detail__contents">{doc.contents ?? ""}</td>
                <td>{doc.source ?? "—"}</td>
                <td>{doc.acl.length ? doc.acl.join(", ") : "—"}</td>
                {managed && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Enable ${doc.title ?? doc.id ?? "document"}`}
                      checked={doc.enabled}
                      disabled={!doc.document_id || toggling.has(doc.document_id)}
                      onChange={() => void toggle(doc)}
                    />
                  </td>
                )}
                {managed && (
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      aria-label={`Edit ${doc.title ?? doc.id ?? "document"}`}
                      disabled={!doc.document_id}
                      onClick={() => setOpenDocument(doc.document_id)}
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <nav className="qh-pagination" aria-label="Document pages">
          <button type="button" disabled={loading || page <= 1} onClick={() => goTo(page - 1)}>
            ‹ Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => goTo(page + 1)}
          >
            Next ›
          </button>
        </nav>
      )}

      {editing && dataset && (
        <DatasetDialog
          mode={{ kind: "edit", dataset }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reloadDataset();
          }}
          onDeleted={() => void navigate(routePath("space-datasets"))}
        />
      )}
      {uploading && (
        <UploadDialog datasetName={name} onClose={() => setUploading(false)} onUploaded={changed} />
      )}
      {openDocument && (
        <DocumentDialog
          datasetName={name}
          documentId={openDocument}
          onClose={() => setOpenDocument(null)}
          onChanged={changed}
        />
      )}
    </section>
  );
}
