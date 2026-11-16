import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useDatasets } from "../../../hooks/useDataset";
import { KeywordSearch } from "../../../components/KeywordSearch";
import { routePath } from "../../../config/routes";
import type { DatasetDialogMode } from "./DatasetDialog";
import { DatasetSummary } from "./DatasetSummary";
import { RetrievalStatus } from "../../../components/RetrievalStatus";
import { DatasetDialog } from "./DatasetDialog";

/** `/space/datasets`: the corpora registered for the retrieval server, a page at a time. */
export function ListView() {
  // The search lives in the URL (`?search_word=`) and runs on submit.
  const [params] = useSearchParams();
  const searchWord = params.get("search_word") ?? "";
  const { datasets, loading, error, hasMore, loadMore, retry, reload } = useDatasets(searchWord);
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = { catalog: { search: location.search, hash: location.hash } };
  const [dialog, setDialog] = useState<DatasetDialogMode | null>(null);
  const closeDialog = () => setDialog(null);
  const refresh = () => {
    closeDialog();
    reload();
  };

  return (
    <section className="sources-catalog datasets-catalog" aria-label="Datasets">
      <div className="sources-catalog__toolbar datasets-catalog__toolbar">
        <KeywordSearch
          label="Find a dataset"
          placeholder="Find a dataset…"
          className="datasets-catalog__search"
        />
        <RetrievalStatus />
        <button
          type="button"
          className="btn-primary tools-catalog__create"
          onClick={() => setDialog({ kind: "create" })}
        >
          <Plus aria-hidden="true" size={16} />
          Create dataset
        </button>
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

      <ul className="sources-catalog__grid datasets-catalog__grid" aria-busy={loading}>
        {datasets.map((dataset) => (
          <li key={dataset.name}>
            <article className="source-card datasets-catalog__card">
              <Link
                className="datasets-catalog__link"
                state={navigationState}
                to={routePath("space-datasets-documents-list", { name: dataset.name })}
              >
                <DatasetSummary dataset={dataset} />
              </Link>
              {dataset.managed && (
                <button
                  type="button"
                  className="btn-ghost btn-sm datasets-catalog__settings"
                  aria-label={`Settings for ${dataset.source}`}
                  onClick={() => setDialog({ kind: "edit", dataset })}
                >
                  <Settings aria-hidden="true" size={14} />
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
              void navigate(routePath("space-datasets-documents-list", { name: dataset.name }), {
                state: navigationState,
              });
            } else refresh();
          }}
          onDeleted={refresh}
        />
      )}
    </section>
  );
}
