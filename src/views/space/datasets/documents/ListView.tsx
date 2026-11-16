import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { useDatasetDocuments } from "../../../../hooks/useDataset";
import { TablePagination } from "../../../../components/TablePagination";
import { useTablePagination } from "../../../../hooks/useTablePagination";
import { KeywordSearch } from "../../../../components/KeywordSearch";
import { updateDocument } from "../../../../services/api";
import type { DatasetDocumentView } from "../../../../models";
import { routePath } from "../../../../config/routes";
import { DocumentDialog } from "./DocumentDialog";
import { UploadDialog } from "./UploadDialog";
import { Dialog } from "../Dialog";
import { SearchTestPanel } from "../SearchTestPanel";
import { confirmDeleteDocument } from "./deleteDocument";

const SEARCH_RESETS = ["current_page"] as const;

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** A dataset's documents, including search, paging and management. */
export function ListView({
  datasetName: name,
  managed,
  available,
  onChanged,
}: {
  datasetName: string;
  managed: boolean;
  available: boolean;
  onChanged: () => void;
}) {
  const location = useLocation();
  const [params] = useSearchParams();
  const searchWord = params.get("search_word") ?? "";
  const { page, pageSize, goTo, setPageSize } = useTablePagination();
  const { documents, paginator, loading, error, reload } = useDatasetDocuments(
    name,
    page,
    searchWord,
    pageSize,
  );
  const [openDocument, setOpenDocument] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState<ReadonlySet<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  // Documents whose enabled switch is saving.
  const [toggling, setToggling] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    if (!loading && !error && paginator && page > Math.max(1, paginator.total_page)) {
      goTo(Math.max(1, paginator.total_page), true);
    }
  }, [loading, error, paginator, page, goTo]);

  const changed = () => {
    reload();
    onChanged();
  };

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

  async function remove(doc: DatasetDocumentView) {
    const id = doc.document_id;
    if (!id || deleting.has(id)) return;
    setDeleting((ids) => new Set(ids).add(id));
    setActionError("");
    try {
      if (await confirmDeleteDocument(name, id)) changed();
    } catch (cause) {
      setActionError(messageOf(cause, "Unable to delete the document."));
    } finally {
      setDeleting((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <>
      {actionError && (
        <div className="error-banner" role="alert">
          <span>{actionError}</span>
        </div>
      )}

      <div className="sources-catalog__toolbar">
        <h3>Documents</h3>
        {available && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setTesting(true)}>
            Retrieval Test
          </button>
        )}
        {managed && (
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setUploading(true)}>
              Add documents
            </button>
            <Link
              className="btn-ghost btn-sm"
              to={{
                pathname: routePath("space-datasets-documents-create", { name }),
                search: location.search,
                hash: location.hash,
              }}
              state={location.state}
            >
              Add files
            </Link>
          </>
        )}
        <KeywordSearch
          label="Find a document"
          placeholder="Find a document…"
          resets={SEARCH_RESETS}
        />
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
        <table className="qh-table datasets-detail__table" aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">ID</th>
              <th scope="col">Title</th>
              <th scope="col">Contents</th>
              <th scope="col">Source</th>
              <th scope="col">Access</th>
              <th scope="col">Characters</th>
              <th scope="col">Status</th>
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
                <td>{(page - 1) * (paginator?.page_size ?? 20) + index + 1}</td>
                <td>
                  <code>{doc.id ?? "—"}</code>
                </td>
                <td>{doc.title ?? "Untitled"}</td>
                <td className="datasets-detail__contents">{doc.contents ?? ""}</td>
                <td>{doc.source ?? "—"}</td>
                <td>{doc.acl.length ? doc.acl.join(", ") : "—"}</td>
                <td
                  data-column="characters"
                  title={
                    doc.contents == null
                      ? undefined
                      : `${doc.contents.length.toLocaleString()} characters`
                  }
                >
                  {doc.contents == null ? "—" : `${(doc.contents.length / 1000).toFixed(1)}k`}
                </td>
                <td>
                  <span className="datasets-document-status" data-enabled={doc.enabled}>
                    {doc.enabled ? "Available" : "Disabled"}
                  </span>
                </td>
                {managed && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Enable ${doc.title ?? doc.id ?? "document"}`}
                      checked={doc.enabled}
                      disabled={
                        !doc.document_id ||
                        toggling.has(doc.document_id) ||
                        deleting.has(doc.document_id)
                      }
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
                      disabled={!doc.document_id || deleting.has(doc.document_id)}
                      onClick={() => setOpenDocument(doc.document_id)}
                    >
                      Rename / edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm btn-danger"
                      aria-label={`Delete ${doc.title ?? doc.id ?? "document"}`}
                      disabled={
                        !doc.document_id ||
                        deleting.has(doc.document_id) ||
                        toggling.has(doc.document_id)
                      }
                      onClick={() => void remove(doc)}
                    >
                      {doc.document_id && deleting.has(doc.document_id) ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {paginator && (paginator.total_record > 0 || page > 1) && (
        <TablePagination
          paginator={paginator}
          page={page}
          pageSize={pageSize}
          loading={loading}
          onPageChange={goTo}
          onPageSizeChange={setPageSize}
        />
      )}

      {testing && available && (
        <Dialog title="Retrieval Test" onClose={() => setTesting(false)}>
          <SearchTestPanel datasetName={name} />
        </Dialog>
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
    </>
  );
}
