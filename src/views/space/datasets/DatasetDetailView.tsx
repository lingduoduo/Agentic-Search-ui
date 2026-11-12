import { Link, useParams, useSearchParams } from "react-router";
import { useDataset, useDatasetDocuments } from "../../../hooks/useDataset";
import { useKeywordSearch } from "../../../hooks/useKeywordSearch";
import { routePath } from "../../../config/routes";
import { DatasetBadges, DatasetHeading } from "./DatasetsView";

// A new search starts again from the first page.
const SEARCH_RESETS = ["current_page"] as const;

/** `/space/datasets/:name`: one corpus and its documents, a table page at a time. */
export function DatasetDetailView() {
  const name = useParams().name ?? "";
  const [params, setParams] = useSearchParams();
  const searchWord = params.get("search_word") ?? "";
  const requested = Number(params.get("current_page"));
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const { query, setQuery, commitKeyword } = useKeywordSearch(SEARCH_RESETS);
  const { dataset, error: datasetError, retry: retryDataset } = useDataset(name);
  const { documents, paginator, loading, error, retry } = useDatasetDocuments(
    name,
    page,
    searchWord,
  );
  const totalPages = paginator?.total_page ?? 0;

  const goTo = (next: number) => {
    const nextParams = new URLSearchParams(params);
    if (next > 1) nextParams.set("current_page", String(next));
    else nextParams.delete("current_page");
    setParams(nextParams);
  };

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
            onClick={retryDataset}
          >
            Retry
          </button>
        </div>
      )}
      {dataset && (
        <div className="source-card datasets-detail__summary">
          <DatasetHeading dataset={dataset} />
          <code className="datasets-catalog__path">{dataset.path ?? "No path"}</code>
          <DatasetBadges dataset={dataset} />
        </div>
      )}

      <div className="sources-catalog__toolbar">
        <h3>Documents</h3>
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
            onClick={retry}
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
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={doc.id ?? `row-${index}`}>
                <td>
                  <code>{doc.id ?? "—"}</code>
                </td>
                <td>{doc.title ?? "Untitled"}</td>
                <td className="datasets-detail__contents">{doc.contents ?? ""}</td>
                <td>{doc.source ?? "—"}</td>
                <td>{doc.acl.length ? doc.acl.join(", ") : "—"}</td>
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
    </section>
  );
}
