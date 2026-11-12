import { Database } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useDatasets } from "../../../hooks/useDataset";
import { useKeywordSearch } from "../../../hooks/useKeywordSearch";
import { routePath } from "../../../config/routes";
import type { DatasetView } from "../../../models";
import { RetrievalStatus } from "../../../components/RetrievalStatus";

/** `/space/datasets`: the corpora registered for the retrieval server, a page at a time. */
export function DatasetsView() {
  // The search lives in the URL (`?search_word=`) and runs on submit.
  const { query, setQuery, commitKeyword } = useKeywordSearch();
  const [params] = useSearchParams();
  const searchWord = params.get("search_word") ?? "";
  const { datasets, loading, error, hasMore, loadMore, retry } = useDatasets(searchWord);

  return (
    <section className="sources-catalog" aria-label="Datasets">
      <div className="sources-catalog__toolbar">
        <RetrievalStatus />
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
            <DatasetCard dataset={dataset} />
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
    </section>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetView }) {
  return (
    <Link className="source-card" to={routePath("space-datasets-detail", { name: dataset.name })}>
      <DatasetHeading dataset={dataset} />
      <code className="datasets-catalog__path">{dataset.path ?? "No path"}</code>
      <DatasetBadges dataset={dataset} />
    </Link>
  );
}

/** Icon tile, label and the "name · domain · docs" line, shared by card and detail page. */
export function DatasetHeading({ dataset }: { dataset: DatasetView }) {
  return (
    <span className="source-card__heading">
      <span className="source-option__icon source-card__icon datasets-catalog__icon">
        <Database aria-hidden="true" size={20} />
      </span>
      <span>
        <strong className="source-option__name">{dataset.source}</strong>
        <small>
          {[
            dataset.name,
            dataset.domain,
            dataset.docs === null ? "" : `${dataset.docs.toLocaleString()} docs`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
    </span>
  );
}

export function DatasetBadges({ dataset }: { dataset: DatasetView }) {
  return (
    <span className="datasets-catalog__badges">
      {dataset.served && <span className="route-pill">Serving</span>}
      {!dataset.available && <span className="route-pill route-pill--degraded">File missing</span>}
    </span>
  );
}
