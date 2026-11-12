import type {
  CreateDatasetRequest,
  DatasetDocumentPage,
  DatasetDocumentView,
  DatasetPage,
  DocumentBatchView,
  DatasetPageParams,
  DatasetQueryView,
  DatasetView,
  HitRequest,
  HitResponse,
  RetrievalStatusView,
  UpdateDatasetRequest,
  UpdateDocumentRequest,
} from "../models";
import { del, get, patch, post, type RequestOptions } from "../utils/request";

const datasetUrl = (name: string) => `/api/datasets/${encodeURIComponent(name)}`;
const documentUrl = (name: string, documentId: string) =>
  `${datasetUrl(name)}/documents/${encodeURIComponent(documentId)}`;

/** Which retrieval server answers queries, and whether it is reachable. */
export function getRetrievalStatus(init?: RequestOptions): Promise<RetrievalStatusView> {
  return get<RetrievalStatusView>("/api/retrieval/status", { signal: init?.signal });
}

/** The registered corpora the retrieval server can serve, a page at a time (admin only). */
export function getDatasets(
  params: DatasetPageParams = {},
  init?: RequestOptions,
): Promise<DatasetPage> {
  return get<DatasetPage>("/api/datasets", { params: { ...params }, signal: init?.signal });
}

/** One registered corpus (admin only). */
export function getDataset(name: string, init?: RequestOptions): Promise<DatasetView> {
  return get<DatasetView>(datasetUrl(name), { signal: init?.signal });
}

/** A corpus's documents, a page at a time (admin only). */
export function getDatasetDocuments(
  name: string,
  params: DatasetPageParams = {},
  init?: RequestOptions,
): Promise<DatasetDocumentPage> {
  return get<DatasetDocumentPage>(`${datasetUrl(name)}/documents`, {
    params: { ...params },
    signal: init?.signal,
  });
}

// --- Managing datasets (admin only). Only managed datasets change; a registered
// corpus becomes managed through importDataset. ---

/** Creates an empty managed dataset. */
export function createDataset(body: CreateDatasetRequest): Promise<DatasetView> {
  return post<DatasetView>("/api/datasets", { body: { ...body } });
}

export function updateDataset(name: string, body: UpdateDatasetRequest): Promise<DatasetView> {
  return patch<DatasetView>(datasetUrl(name), { body: { ...body } });
}

/** An imported dataset's original corpus file is registered again. */
export function deleteDataset(name: string): Promise<void> {
  return del<void>(datasetUrl(name));
}

/** Copies a registered corpus's documents into the store so it can be managed. */
export function importDataset(name: string): Promise<DatasetView> {
  return post<DatasetView>(`${datasetUrl(name)}/import`);
}

export function getDocument(
  name: string,
  documentId: string,
  init?: RequestOptions,
): Promise<DatasetDocumentView> {
  return get<DatasetDocumentView>(documentUrl(name, documentId), { signal: init?.signal });
}

/** Rename (`title`) and/or enable a document. */
export function updateDocument(
  name: string,
  documentId: string,
  body: UpdateDocumentRequest,
): Promise<DatasetDocumentView> {
  return patch<DatasetDocumentView>(documentUrl(name, documentId), { body: { ...body } });
}

export function deleteDocument(name: string, documentId: string): Promise<void> {
  return del<void>(documentUrl(name, documentId));
}

/** Upload .jsonl, .txt or .md files; they are processed in the background. */
export function createDocuments(name: string, files: File[]): Promise<DocumentBatchView> {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  return post<DocumentBatchView>(`${datasetUrl(name)}/documents`, { body });
}

/** How each file of an upload batch is doing. */
export function getDocumentsStatus(
  name: string,
  batch: string,
  init?: RequestOptions,
): Promise<DocumentBatchView> {
  return get<DocumentBatchView>(
    `${datasetUrl(name)}/documents/batch/${encodeURIComponent(batch)}`,
    { signal: init?.signal },
  );
}

/** Search this dataset alone (its enabled documents); the query is logged. */
export function hit(name: string, body: HitRequest): Promise<HitResponse> {
  return post<HitResponse>(`${datasetUrl(name)}/hit`, { body: { ...body } });
}

/** The latest search-test queries, newest first. */
export function getDatasetQueries(
  name: string,
  init?: RequestOptions,
): Promise<DatasetQueryView[]> {
  return get<DatasetQueryView[]>(`${datasetUrl(name)}/queries`, { signal: init?.signal });
}
