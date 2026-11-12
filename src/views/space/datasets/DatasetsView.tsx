import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { getDatasets } from "../../../services/api";
import type { DatasetView } from "../../../models";
import { RetrievalStatus } from "../../../components/RetrievalStatus";

/** `/space/datasets`: the corpora registered for the retrieval server. */
export function DatasetsView() {
  const [datasets, setDatasets] = useState<DatasetView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [term, setTerm] = useState("");

  // A retry, or leaving the page, aborts the request in flight.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getDatasets({ signal: controller.signal })
      .then(setDatasets)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load datasets.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const query = term.trim().toLowerCase();
  const shown = datasets.filter(
    (d) => query === "" || `${d.name} ${d.source} ${d.domain ?? ""}`.toLowerCase().includes(query),
  );

  return (
    <section className="sources-catalog" aria-label="Datasets">
      <div className="sources-catalog__toolbar">
        <RetrievalStatus />
        <input
          type="search"
          aria-label="Find a dataset"
          placeholder="Find a dataset…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="account-retry"
            aria-label="Retry loading datasets"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {loading && <p role="status">Loading datasets…</p>}

      <ul className="sources-catalog__grid">
        {shown.map((dataset) => (
          <li key={dataset.name}>
            <article className="source-card datasets-catalog__card" aria-label={dataset.name}>
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
              <code className="datasets-catalog__path">{dataset.path ?? "No path"}</code>
              <span className="datasets-catalog__badges">
                {dataset.served && <span className="route-pill">Serving</span>}
                {!dataset.available && (
                  <span className="route-pill route-pill--degraded">File missing</span>
                )}
              </span>
            </article>
          </li>
        ))}
      </ul>
      {!loading && !error && shown.length === 0 && (
        <p className="sources-catalog__empty">
          {datasets.length ? "No datasets match." : "No datasets registered."}
        </p>
      )}
    </section>
  );
}
