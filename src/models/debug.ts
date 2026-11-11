// --- Dev console: per-mode retrieval inspection ---

export type RetrievalMode = "sparse" | "dense" | "hybrid" | "graph";

export interface RetrievalResultRow {
  doc_id: string;
  title: string;
  text?: string;
  score: number;
}

export interface DebugRetrievalResponse {
  results: RetrievalResultRow[];
  retrieval_mode: string;
  executed_queries: string[];
  latency_ms: number;
}

export interface DebugRetrievalParams {
  query: string;
  top_k: number;
  rrf_k?: number;
  mmr_lambda?: number;
  over_fetch?: number;
  rerank?: boolean;
}

export interface DebugRetrievalOutcome {
  status: number;
  ok: boolean;
  data: DebugRetrievalResponse | null;
  detail: string | null;
}

export interface RetrievalStatusView {
  /** Scheme, host and port only. */
  url: string;
  /** Served in-process by the API rather than a separate server. */
  embedded: boolean;
  ok: boolean;
}

export interface ServerHealth {
  name: string;
  url: string;
  status: "up" | "down" | string;
}

export interface StageRecordView {
  stage: "intent" | "search" | "tool" | "llm" | "final";
  label: string;
  timestamp: number;
  duration_ms: number | null;
  payload: Record<string, unknown>;
}

export interface RequestSummary {
  request_id: string;
  query: string;
  created_at: number;
  route: string | null;
  stage_count: number;
}

export interface RequestSnapshot {
  request_id: string;
  query: string;
  created_at: number;
  route: string | null;
  route_degraded: string | null;
  total_ms: number | null;
  stages: StageRecordView[];
}

/** Which side of the pipeline an eval metric describes; order is display order. */
export const METRIC_GROUPS = ["retrieval", "generation", "reward", "latency", "other"] as const;

export type MetricGroup = (typeof METRIC_GROUPS)[number];

export interface EvalResultFile {
  name: string;
  modified: number;
  /** Every finite number in the file, nested keys dotted. */
  metrics: Record<string, number>;
  /** The same numbers bucketed by the shared taxonomy; empty groups omitted. */
  groups?: Partial<Record<MetricGroup, Record<string, number>>>;
}

/** One row of GET /api/debug/latency — a route's recent-request window. */
export interface RouteLatencyRow {
  method: string;
  route: string;
  count: number;
  errors: number;
  p50_ms: number;
  p95_ms: number;
  max_ms: number;
}

/** Per-stage window from GET /api/debug/latency: requests that used the stage. */
export interface StageLatency {
  count: number;
  p50_ms?: number;
  p95_ms?: number;
  max_ms?: number;
  avg_docs?: number;
  cache_hit_rate?: number;
  avg_prompt_tokens?: number;
  avg_completion_tokens?: number;
}

export interface StageLatencyResponse {
  retrieval: StageLatency;
  /** Answer synthesis only. */
  generation: StageLatency;
  /** Every other LLM call on the way: query transforms, sufficiency, intent. */
  auxiliary?: StageLatency;
}

export interface RouteLatencyResponse {
  routes: RouteLatencyRow[];
  stages?: StageLatencyResponse;
}

export interface QueryTransformResult {
  original: string;
  variants: string[];
  merged_filters: Record<string, unknown>;
  active: boolean;
  legs: {
    sub_queries?: string[];
    multi_query?: string[];
    rewrite?: string | null;
    hyde_text?: string | null;
    step_back?: string | null;
    keywords?: string[];
  };
}

export interface ServerHealthResponse {
  servers: ServerHealth[];
}
export interface EvalResultsResponse {
  results: EvalResultFile[];
}
export interface DebugRequestsResponse {
  requests: RequestSummary[];
}
