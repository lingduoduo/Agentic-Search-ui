// --- Knowledge base: the retrieval server and the corpora it can serve ---

export interface RetrievalStatusView {
  /** Scheme, host and port only. */
  url: string;
  /** Served in-process by the API rather than a separate server. */
  embedded: boolean;
  ok: boolean;
}

/** A corpus registered in the backend's data/corpora.json (GET /api/datasets). */
export interface DatasetView {
  name: string;
  /** The corpus .jsonl on the server. */
  path: string | null;
  docs: number | null;
  domain: string | null;
  /** The label results from this corpus cite. */
  source: string;
  /** Its file exists on the server. */
  available: boolean;
  /** Loaded by the in-process retriever; null when a separate retrieval server answers. */
  served: boolean | null;
}
