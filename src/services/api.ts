import type {
  AgentExperienceRequest,
  AgentExperienceResponse,
  ChatSessionView,
  DebugRetrievalOutcome,
  DebugRetrievalParams,
  DebugRetrievalResponse,
  EvalResultFile,
  QueryTransformResult,
  RetrievalMode,
  FeedbackSignal,
  FeedbackTarget,
  RouteLatencyResponse,
  RetrievalStatusView,
  ServerHealth,
  RequestSnapshot,
  RequestSummary,
  SendToolMessageBody,
  SessionCreateRequest,
  SSEEvent,
  ToolSessionSummary,
  ToolStreamEvent,
  ChatStreamEvent,
  SendChatMessageBody,
  SendSearchMessageBody,
  SearchFullResponse,
  SearchDomainFamily,
  SearchDomainOption,
} from "../models";
import { RequestError, get, post, stream } from "../utils/request";

// Compatibility exports; request implementations live in their domain services.
export { login, logout, getCurrentUser, getPermissions } from "./auth";
export {
  getAdminSummary,
  getAnalyticsByLLM,
  getAnalyticsByPersona,
  getAnalyticsByFlow,
  getQueryHistory,
  getAuditSummary,
} from "./admin";

// Tool registry/provider requests are implemented once in the domain service.
export {
  getDebugTools,
  discoverTools,
  listTools,
  discoverAdminTools,
  registerOpenAPITools,
  deleteOpenAPIProvider,
  invokeTool,
  getApiToolProvidersWithPage,
  validateOpenAPISchema,
  createApiToolProvider,
  updateApiToolProvider,
  deleteApiToolProvider,
  getApiToolProvider,
} from "./tools";

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
): Promise<DebugRetrievalOutcome> {
  try {
    const data = await post<DebugRetrievalResponse>(`/api/debug/retrieval/${mode}`, {
      body: params,
    });
    return { status: 200, ok: true, data, detail: null };
  } catch (err) {
    if (!(err instanceof RequestError) || err.status === undefined) throw err;
    return { status: err.status, ok: false, data: null, detail: err.message };
  }
}

/** Which retrieval server answers queries, and whether it is reachable. */
export function getRetrievalStatus(): Promise<RetrievalStatusView> {
  return get<RetrievalStatusView>("/api/retrieval/status");
}

/** Fetch reachability of the configured backend servers (dev console). */
export function getServerHealth(): Promise<{ servers: ServerHealth[] }> {
  return get<{ servers: ServerHealth[] }>("/api/debug/health");
}

/** List evaluation result files from the configured results dir (dev console). */
export function getEvalResults(): Promise<{ results: EvalResultFile[] }> {
  return get<{ results: EvalResultFile[] }>("/api/debug/eval-results");
}

/** Per-route request latency from the dev-console middleware. */
export function getRouteLatency(): Promise<RouteLatencyResponse> {
  return get<RouteLatencyResponse>("/api/debug/latency");
}

/**
 * Session-level thumbs, the signal the SFT and feedback-GRPO loaders read.
 * `target` says whether the sources or the answer were at fault.
 */
export function submitSessionFeedback(
  sessionId: string,
  signal: FeedbackSignal,
  target: FeedbackTarget = "overall",
  init?: Pick<RequestInit, "signal">,
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/api/feedback", {
    body: { session_id: sessionId, signal, target, source: "answer_panel" },
    signal: init?.signal,
  });
}

/** Run only the query-transform pipeline for a query (dev console). */
export function runQueryTransform(query: string): Promise<QueryTransformResult> {
  return post<QueryTransformResult>("/api/debug/query-transform", {
    body: { query },
  });
}

/** List recent captured request runs (dev console — Request Inspector). */
export async function listDebugRequests(): Promise<{ requests: RequestSummary[] }> {
  return get<{ requests: RequestSummary[] }>("/api/debug/requests");
}

/** Fetch one request's full stage-by-stage snapshot (dev console — Request Inspector). */
export async function getDebugRequest(id: string): Promise<RequestSnapshot> {
  return get<RequestSnapshot>(`/api/debug/request/${encodeURIComponent(id)}`);
}

/** HTTP status attached to a request rejection, when there was one. */
export function errorStatus(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err
    ? (err as { status?: number }).status
    : undefined;
}

export function createSession(
  request: SessionCreateRequest = {},
  init?: Pick<RequestInit, "signal">,
): Promise<ChatSessionView> {
  return post<ChatSessionView>("/api/sessions", {
    body: request,
    signal: init?.signal,
  });
}

export function getSession(
  sessionId: string,
  init?: Pick<RequestInit, "signal">,
): Promise<ChatSessionView> {
  return get<ChatSessionView>(`/api/sessions/${sessionId}`, { signal: init?.signal });
}

export function runAgent(
  request: AgentExperienceRequest,
  init?: Pick<RequestInit, "signal">,
): Promise<AgentExperienceResponse> {
  return post<AgentExperienceResponse>("/api/agent", {
    body: request,
    signal: init?.signal,
  });
}

export function submitToolApproval(
  approvalId: string,
  decision: "approve" | "deny",
  init?: Pick<RequestInit, "signal">,
): Promise<unknown> {
  return post<unknown>(`/api/agent/approvals/${approvalId}`, {
    body: { decision },
    signal: init?.signal,
  });
}

export function submitToolEscalation(
  escalationId: string,
  decision: "retry" | "skip" | "cancel",
  init?: Pick<RequestInit, "signal">,
): Promise<unknown> {
  return post<unknown>(`/api/agent/escalations/${escalationId}`, {
    body: { decision },
    signal: init?.signal,
  });
}

export async function* streamAgent(
  request: AgentExperienceRequest,
  init?: Pick<RequestInit, "signal">,
): AsyncGenerator<SSEEvent> {
  yield* stream<SSEEvent>("/api/agent/stream", { body: request, signal: init?.signal });
}

export function submitFeedback(
  messageId: string,
  isPositive: boolean,
  feedbackText?: string,
  init?: Pick<RequestInit, "signal">,
): Promise<void> {
  return post<void>("/chat/create-chat-message-feedback", {
    body: {
      chat_message_id: messageId,
      is_positive: isPositive,
      feedback_text: feedbackText ?? null,
    },
    signal: init?.signal,
  });
}

/** Streams a local-model surface; a 400 means no local model is configured. */
async function* streamWithModel<T>(
  url: string,
  body: object,
  init?: Pick<RequestInit, "signal">,
): AsyncGenerator<T> {
  try {
    yield* stream<T>(url, { body: { stream: true, ...body }, signal: init?.signal });
  } catch (err) {
    if (errorStatus(err) === 400) throw new Error("NO_LOCAL_MODEL", { cause: err });
    throw err;
  }
}

export async function* sendToolMessage(
  body: SendToolMessageBody,
  init?: Pick<RequestInit, "signal">,
): AsyncGenerator<ToolStreamEvent> {
  yield* streamWithModel<ToolStreamEvent>("/tool/send-tool-message", body, init);
}

export function getToolHistory(): Promise<{ sessions: ToolSessionSummary[] }> {
  return get<{ sessions: ToolSessionSummary[] }>("/tool/tool-history");
}

export async function* sendChatMessage(
  body: SendChatMessageBody,
  init?: Pick<RequestInit, "signal">,
): AsyncGenerator<ChatStreamEvent> {
  yield* streamWithModel<ChatStreamEvent>("/chat/send-chat-message", body, init);
}

export function fetchSearchDomains(signal?: AbortSignal): Promise<{
  domains: SearchDomainOption[];
  categories?: SearchDomainFamily[];
}> {
  return get("/api/search-domains", { signal });
}

export function sendSearchMessage(body: SendSearchMessageBody): Promise<SearchFullResponse> {
  return post<SearchFullResponse>("/search/send-search-message", {
    body: {
      search_query: body.search_query,
      num_hits: body.num_hits ?? 8,
      run_query_expansion: false,
      stream: false,
    },
  });
}
