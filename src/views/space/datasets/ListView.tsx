import { useState } from "react";
import { Plus } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useDatasets } from "../../../hooks/useDataset";
import { useKeywordSearch } from "../../../hooks/useKeywordSearch";
import { routePath } from "../../../config/routes";
import type { DatasetDialogMode } from "./DatasetDialog";
import { DatasetBadges, DatasetHeading } from "./DatasetSummary";
import { RetrievalStatus } from "../../../components/RetrievalStatus";
import { DatasetDialog } from "./DatasetDialog";

/** `/space/datasets`: the corpora registered for the retrieval server, a page at a time. */
export function ListView() {
  // The search lives in the URL (`?search_word=`) and runs on submit.
  const { query, setQuery, commitKeyword } = useKeywordSearch();
  const [params] = useSearchParams();
  const searchWord = params.get("search_word") ?? "";
  const { datasets, loading, error, hasMore, loadMore, retry, reload } = useDatasets(searchWord);
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DatasetDialogMode | null>(null);
  const closeDialog = () => setDialog(null);
  const refresh = () => {
    closeDialog();
    reload();
  };

  return (
    <section className="sources-catalog" aria-label="Datasets">
      <div className="sources-catalog__toolbar">
        <RetrievalStatus />
        <button
          type="button"
          className="btn-primary tools-catalog__create"
          onClick={() => setDialog({ kind: "create" })}
        >
          <Plus aria-hidden="true" size={16} />
          Create dataset
        </button>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            commitKeyword(query);
          }}
        >
          <input
            type="search"
            aria-label="Find a dataset"
            placeholder="Find a dataset…"
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
            aria-label="Retry loading datasets"
            onClick={retry}
          >
            Retry
          </button>
        </div>
      )}

      <ul className="sources-catalog__grid">
        {datasets.map((dataset) => (
          <li key={dataset.name}>
            <article className="source-card">
              <Link
                className="datasets-catalog__link"
                to={routePath("space-datasets-detail", { name: dataset.name })}
              >
                <DatasetHeading dataset={dataset} />
                {dataset.description && (
                  <span className="source-card__description">{dataset.description}</span>
                )}
                <code className="datasets-catalog__path">{dataset.path ?? "No path"}</code>
                <DatasetBadges dataset={dataset} />
              </Link>
              {dataset.managed && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  aria-label={`Settings for ${dataset.source}`}
                  onClick={() => setDialog({ kind: "edit", dataset })}
                >
                  Settings
                </button>
              )}
            </article>
          </li>
        ))}
      </ul>
      {loading && <p role="status">Loading datasets…</p>}
      {!loading && !error && datasets.length === 0 && (
        <p className="sources-catalog__empty">
          {searchWord ? "No datasets match." : "No datasets registered."}
        </p>
      )}
      {hasMore && !loading && (
        <div className="tools-catalog__more">
          <button type="button" onClick={loadMore}>
            Load more
          </button>
        </div>
      )}

      {dialog && (
        <DatasetDialog
          mode={dialog}
          onClose={closeDialog}
          onSaved={(dataset) => {
            if (dialog.kind === "create") {
              closeDialog();
              void navigate(routePath("space-datasets-detail", { name: dataset.name }));
            } else refresh();
          }}
          onDeleted={refresh}
        />
      )}
    </section>
  );
}
