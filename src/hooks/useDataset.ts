import { useCallback, useEffect, useRef, useState } from "react";
import { getDataset, getDatasetDocuments, getDatasets, getDocumentsStatus } from "../services/api";
import type { DatasetDocumentView, DatasetView, DocumentBatchView, Paginator } from "../models";

export const PAGE_SIZE = 20;

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/**
 * The dataset list, a page at a time. A new search word starts again from page
 * 1; `loadMore` appends the next page. A newer request aborts an older one.
 */
export function useDatasets(searchWord: string) {
  const [datasets, setDatasets] = useState<DatasetView[]>([]);
  const [paginator, setPaginator] = useState<Paginator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<{ controller: AbortController; page: number } | null>(null);

  const fetchPage = useCallback(
    (page: number) => {
      request.current?.controller.abort();
      const controller = new AbortController();
      request.current = { controller, page };
      setLoading(true);
      setError("");
      getDatasets(
        { current_page: page, page_size: PAGE_SIZE, search_word: searchWord },
        { signal: controller.signal },
      )
        .then((res) => {
          setDatasets((prev) => {
            if (page === 1) return res.list;
            // The manifest can change between pages; never show a dataset twice.
            const seen = new Set(prev.map((d) => d.name));
            return [...prev, ...res.list.filter((d) => !seen.has(d.name))];
          });
          setPaginator(res.paginator);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(messageOf(cause, "Unable to load datasets."));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    },
    [searchWord],
  );

  useEffect(() => {
    fetchPage(1);
    return () => request.current?.controller.abort();
  }, [fetchPage]);

  const hasMore = paginator !== null && paginator.current_page < paginator.total_page;
  return {
    datasets,
    paginator,
    loading,
    error,
    hasMore,
    loadMore: () => {
      if (!loading && hasMore) fetchPage(paginator.current_page + 1);
    },
    // Re-requests the page that failed.
    retry: () => fetchPage(request.current?.page ?? 1),
  };
}

/** One dataset's details. */
export function useDataset(name: string) {
  const [dataset, setDataset] = useState<DatasetView | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    getDataset(name, { signal: controller.signal })
      .then(setDataset)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageOf(cause, "Unable to load the dataset."));
      });
    return () => controller.abort();
  }, [name, attempt]);

  return { dataset, error, reload: () => setAttempt((n) => n + 1) };
}

/** One page of a dataset's documents; each page replaces the last (a table, not a feed). */
export function useDatasetDocuments(name: string, page: number, searchWord: string) {
  const [documents, setDocuments] = useState<DatasetDocumentView[]>([]);
  const [paginator, setPaginator] = useState<Paginator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getDatasetDocuments(
      name,
      { current_page: page, page_size: PAGE_SIZE, search_word: searchWord },
      { signal: controller.signal },
    )
      .then((res) => {
        setDocuments(res.list);
        setPaginator(res.paginator);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageOf(cause, "Unable to load documents."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [name, page, searchWord, attempt]);

  return { documents, paginator, loading, error, reload: () => setAttempt((n) => n + 1) };
}

export const BATCH_POLL_MS = 1000;

/**
 * Follows an upload batch from the server's first answer until every file is
 * done, polling once a second. Starts from `accepted`, read once on mount.
 */
export function useDocumentBatch(name: string, accepted: DocumentBatchView) {
  const [batch, setBatch] = useState(accepted);
  const [error, setError] = useState("");
  const batchId = accepted.batch;

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = () => {
      getDocumentsStatus(name, batchId, { signal: controller.signal })
        .then((view) => {
          setBatch(view);
          if (!view.done) timer = setTimeout(poll, BATCH_POLL_MS);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(messageOf(cause, "Unable to check the upload."));
        });
    };
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [name, batchId]);

  return { batch, error };
}
