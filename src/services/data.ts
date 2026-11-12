import type { DatasetView, RetrievalStatusView } from "../models";
import { get, type RequestOptions } from "../utils/request";

/** Which retrieval server answers queries, and whether it is reachable. */
export function getRetrievalStatus(init?: RequestOptions): Promise<RetrievalStatusView> {
  return get<RetrievalStatusView>("/api/retrieval/status", { signal: init?.signal });
}

/** The registered corpora the retrieval server can serve (admin only). */
export function getDatasets(init?: RequestOptions): Promise<DatasetView[]> {
  return get<DatasetView[]>("/api/datasets", { signal: init?.signal });
}
