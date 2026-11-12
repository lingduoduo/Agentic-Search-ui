import type {
  DatasetDocumentPage,
  DatasetPage,
  DatasetPageParams,
  DatasetView,
  RetrievalStatusView,
} from "../models";
import { get, type RequestOptions } from "../utils/request";

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
  return get<DatasetView>(`/api/datasets/${encodeURIComponent(name)}`, { signal: init?.signal });
}

/** A corpus's documents, a page at a time (admin only). */
export function getDatasetDocuments(
  name: string,
  params: DatasetPageParams = {},
  init?: RequestOptions,
): Promise<DatasetDocumentPage> {
  return get<DatasetDocumentPage>(`/api/datasets/${encodeURIComponent(name)}/documents`, {
    params: { ...params },
    signal: init?.signal,
  });
}
