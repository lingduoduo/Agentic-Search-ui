import type {
  RetrievalMode,
  DebugRetrievalParams,
  DebugRetrievalOutcome,
  DebugRetrievalResponse,
  ServerHealthResponse,
  EvalResultsResponse,
  RouteLatencyResponse,
  QueryTransformResult,
  DebugRequestsResponse,
  RequestSnapshot,
} from "../models";
import { get, post, RequestError, type RequestOptions } from "../utils/request";

/**
 * Run one per-mode retrieval against the dev-console proxy.
 *
 * Unlike the other calls, this never throws on a non-2xx response: the
 * Retrieval Lab needs to render mode-specific states (503 = dense unavailable,
 * 404 = endpoint not mounted) rather than a generic error.
 */
export async function runDebugRetrieval(
  mode: RetrievalMode,
  params: DebugRetrievalParams,
  init?: RequestOptions,
): Promise<DebugRetrievalOutcome> {
  try {
    const data = await post<DebugRetrievalResponse>(`/api/debug/retrieval/${mode}`, {
      body: params,
      signal: init?.signal,
    });
    return { status: 200, ok: true, data, detail: null };
  } catch (err) {
    init?.signal?.throwIfAborted();
    if (!(err instanceof RequestError) || err.status === undefined) throw err;
    return { status: err.status, ok: false, data: null, detail: err.message };
  }
}

/** Fetch reachability of the configured backend servers (dev console). */
export function getServerHealth(init?: RequestOptions): Promise<ServerHealthResponse> {
  return get<ServerHealthResponse>("/api/debug/health", { signal: init?.signal });
}

/** List evaluation result files from the configured results dir (dev console). */
export function getEvalResults(init?: RequestOptions): Promise<EvalResultsResponse> {
  return get<EvalResultsResponse>("/api/debug/eval-results", { signal: init?.signal });
}

/** Per-route request latency from the dev-console middleware. */
export function getRouteLatency(init?: RequestOptions): Promise<RouteLatencyResponse> {
  return get<RouteLatencyResponse>("/api/debug/latency", { signal: init?.signal });
}

/** Run only the query-transform pipeline for a query (dev console). */
export function runQueryTransform(
  query: string,
  init?: RequestOptions,
): Promise<QueryTransformResult> {
  return post<QueryTransformResult>("/api/debug/query-transform", {
    body: { query },
    signal: init?.signal,
  });
}

/** List recent captured request runs (dev console — Request Inspector). */
export async function listDebugRequests(init?: RequestOptions): Promise<DebugRequestsResponse> {
  return get<DebugRequestsResponse>("/api/debug/requests", { signal: init?.signal });
}

/** Fetch one request's full stage-by-stage snapshot (dev console — Request Inspector). */
export async function getDebugRequest(id: string, init?: RequestOptions): Promise<RequestSnapshot> {
  return get<RequestSnapshot>(`/api/debug/request/${encodeURIComponent(id)}`, {
    signal: init?.signal,
  });
}
