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
  /** Its documents live in the backend's store and can be edited; otherwise import it first. */
  managed: boolean;
  /** Managed datasets only. */
  description: string | null;
  updated_at: string | null;
}

export interface CreateDatasetRequest {
  /** The corpus key: lowercase letters, digits, `-` and `_`; fixed once created. */
  name: string;
  description?: string;
  domain?: string | null;
  source?: string | null;
}

/** Only the fields sent change; a blank domain or source clears it. */
export interface UpdateDatasetRequest {
  description?: string;
  domain?: string | null;
  source?: string | null;
}

/** Rename and/or enable a document of a managed dataset. */
export interface UpdateDocumentRequest {
  title?: string;
  enabled?: boolean;
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

/** One document of a corpus. */
export interface DatasetDocumentView {
  /** The corpus id search results cite. */
  id: string | null;
  /** The store's id, for the document calls; null for an unmanaged corpus. */
  document_id: string | null;
  title: string | null;
  contents: string | null;
  /** The document's own source, else its corpus's label. */
  source: string | null;
  acl: string[];
  /** Disabled documents stay in the dataset but search does not see them. */
  enabled: boolean;
  updated_at: string | null;
}

export interface DatasetDocumentPage {
  list: DatasetDocumentView[];
  paginator: Paginator;
}

/** One file of an upload batch. */
export interface UploadFileView {
  filename: string;
  /** waiting -> parsing -> completed | error */
  status: "waiting" | "parsing" | "completed" | "error";
  /** Why the file was rejected (whole file: none of its documents were added). */
  error: string | null;
  document_count: number;
}

/** An upload's per-file progress (`getDocumentsStatus`). */
export interface DocumentBatchView {
  batch: string;
  files: UploadFileView[];
  /** Every file is completed or error. */
  done: boolean;
}

/** A search test against one dataset (`hit`). */
export interface HitRequest {
  query: string;
  /** 1–20; the backend defaults to 5. */
  top_k?: number;
}

export interface HitResult {
  id: string | null;
  title: string | null;
  contents: string | null;
  source: string | null;
  /** TF-IDF cosine similarity, 0–1. */
  score: number;
}

export interface HitResponse {
  query: string;
  top_k: number;
  results: HitResult[];
  latency_ms: number;
}

/** A logged search-test query (`getDatasetQueries`), newest first. */
export interface DatasetQueryView {
  query: string;
  top_k: number;
  result_count: number;
  created_at: string | null;
}
