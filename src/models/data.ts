// --- Knowledge base: the retrieval server and the corpora it can serve ---

import type { Paginator } from "./tools";

export interface RetrievalStatusView {
  /** Scheme, host and port only. */
  url: string;
  /** Served in-process by the API rather than a separate server. */
  embedded: boolean;
  ok: boolean;
}

/** A corpus registered in the backend's data/corpora.json. */
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

/** Query for the paged lists: `GET /api/datasets` and a corpus's documents. */
export interface DatasetPageParams {
  current_page?: number;
  page_size?: number;
  /** Matches dataset name, label or domain; document title or contents. */
  search_word?: string;
}

export interface DatasetPage {
  list: DatasetView[];
  paginator: Paginator;
}

/** One document in a corpus's .jsonl file. */
export interface DatasetDocumentView {
  id: string | null;
  title: string | null;
  contents: string | null;
  /** The document's own source, else its corpus's label. */
  source: string | null;
  acl: string[];
}

export interface DatasetDocumentPage {
  list: DatasetDocumentView[];
  paginator: Paginator;
}
