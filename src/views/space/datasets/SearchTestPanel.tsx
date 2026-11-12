import { useCallback, useEffect, useState } from "react";
import { getDatasetQueries, hit } from "../../../services/api";
import type { DatasetQueryView, HitResponse } from "../../../models";

const TOP_K_OPTIONS = [3, 5, 10, 20];

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/**
 * Search one dataset alone and see what it returns, with recent test queries
 * to run again. The backend indexes the dataset's enabled documents for each
 * test, so it reflects edits at once, whatever the retrieval server serves.
 */
export function SearchTestPanel({ datasetName }: { datasetName: string }) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [response, setResponse] = useState<HitResponse | null>(null);
  const [recent, setRecent] = useState<DatasetQueryView[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const loadRecent = useCallback(
    (signal?: AbortSignal) =>
      getDatasetQueries(datasetName, { signal }).then(setRecent, () => {
        // Recent queries are a convenience; the test still works without them.
      }),
    [datasetName],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadRecent(controller.signal);
    return () => controller.abort();
  }, [loadRecent]);

  async function run(text: string, k: number) {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Enter a query.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      setResponse(await hit(datasetName, { query: trimmed, top_k: k }));
      void loadRecent();
    } catch (cause) {
      setResponse(null);
      setError(messageOf(cause, "Unable to run the search test."));
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="datasets-search" aria-label="Search test">
      <h3>Search test</h3>
      <form
        role="search"
        className="datasets-search__form"
        onSubmit={(event) => {
          event.preventDefault();
          void run(query, topK);
        }}
      >
        <input
          type="search"
          aria-label="Test query"
          placeholder="Ask what this dataset should answer…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Results"
          value={topK}
          onChange={(event) => setTopK(Number(event.target.value))}
        >
          {TOP_K_OPTIONS.map((k) => (
            <option key={k} value={k}>
              Top {k}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary btn-sm" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div className="datasets-search__results">
          <p className="datasets-detail__note" role="status">
            {response.results.length
              ? `${response.results.length} result${response.results.length === 1 ? "" : "s"} for “${response.query}” in ${response.latency_ms} ms`
              : `No documents match “${response.query}”.`}
          </p>
          <ol aria-label="Search test results">
            {response.results.map((result, index) => (
              <li key={`${result.id ?? "result"}-${index}`}>
                <div className="datasets-search__result-top">
                  <strong>{result.title ?? result.id ?? "Untitled"}</strong>
                  <span className="route-pill" title="TF-IDF similarity, 0 to 1">
                    {result.score.toFixed(3)}
                  </span>
                </div>
                <small>
                  <code>{result.id ?? "—"}</code> · {result.source ?? "No source"}
                </small>
                <p>{result.contents ?? ""}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recent.length > 0 && (
        <div className="datasets-search__recent">
          <span>Recent queries</span>
          <ul aria-label="Recent queries">
            {recent.map((item, index) => (
              <li key={`${item.created_at ?? ""}-${index}`}>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title={`Top ${item.top_k} · ${item.result_count} result${item.result_count === 1 ? "" : "s"}`}
                  disabled={searching}
                  onClick={() => {
                    setQuery(item.query);
                    setTopK(item.top_k);
                    void run(item.query, item.top_k);
                  }}
                >
                  {item.query}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
