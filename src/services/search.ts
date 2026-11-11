import type {
  RetrievalStatusView,
  SearchDomainsResponse,
  SendSearchMessageBody,
  SearchFullResponse,
} from "../models";
import { get, post, type RequestOptions } from "../utils/request";

/** Which retrieval server answers queries, and whether it is reachable. */
export function getRetrievalStatus(init?: RequestOptions): Promise<RetrievalStatusView> {
  return get<RetrievalStatusView>("/api/retrieval/status", { signal: init?.signal });
}

export function fetchSearchDomains(signal?: AbortSignal): Promise<SearchDomainsResponse> {
  return get<SearchDomainsResponse>("/api/search-domains", { signal });
}

export function sendSearchMessage(
  body: SendSearchMessageBody,
  init?: RequestOptions,
): Promise<SearchFullResponse> {
  return post<SearchFullResponse>("/search/send-search-message", {
    body: {
      search_query: body.search_query,
      num_hits: body.num_hits ?? 8,
      run_query_expansion: false,
      stream: false,
    },
    signal: init?.signal,
  });
}
