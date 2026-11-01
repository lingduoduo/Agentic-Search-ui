import type {
  AdminSurfaceSummary,
  AgentExperienceRequest,
  AgentExperienceResponse,
  AuditSummary,
  BreakdownAnalytics,
  ChatSessionView,
  CurrentUser,
  DebugRetrievalOutcome,
  DebugRetrievalParams,
  DebugRetrievalResponse,
  EvalResultFile,
  QueryTransformResult,
  RetrievalMode,
  FeedbackSignal,
  FeedbackTarget,
  Permission,
  RouteLatencyResponse,
  ServerHealth,
  DebugToolsResult,
  ToolDiscoverResult,
  OpenAPIRegisterRequest,
  OpenAPIRegisterResponse,
  QueryHistoryPage,
  RequestSnapshot,
  RequestSummary,
  SendToolMessageBody,
  SessionCreateRequest,
  SSEEvent,
  ToolInvokeRequest,
  ToolInvokeResponse,
  ToolSessionSummary,
  ToolStreamEvent,
  ToolView,
  ChatStreamEvent,
  SendChatMessageBody,
  SendSearchMessageBody,
  SearchFullResponse,
  SearchDomainOption,
} from "../interfaces";
import { RequestError, del, get, post, stream } from "../utils/request";

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

/** Registered tools + the discovery catalog grouped by server (dev console). */
export function getDebugTools(): Promise<DebugToolsResult> {
  return get<DebugToolsResult>("/api/debug/tools");
}

/** Rank tools for a query via the semantic router (dev console). */
export function discoverTools(query: string): Promise<ToolDiscoverResult> {
  return post<ToolDiscoverResult>("/api/debug/tools/discover", {
    body: { query },
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

/** The backend's login form sets the HttpOnly session cookie on success. */
export function login(email: string, password: string): Promise<CurrentUser> {
  return post<CurrentUser>("/auth/login", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
}

/** Clears the session cookie; succeeds even when the session has expired. */
export function logout(): Promise<void> {
  return post<void>("/auth/logout");
}

export function getCurrentUser(): Promise<CurrentUser> {
  return get<CurrentUser>("/me");
}

export function getPermissions(): Promise<Permission[]> {
  return get<Permission[]>("/me/permissions");
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

export function getAdminSummary(init?: Pick<RequestInit, "signal">): Promise<AdminSurfaceSummary> {
  return get<AdminSurfaceSummary>("/admin/observability/summary", { signal: init?.signal });
}

export function getAnalyticsByLLM(init?: Pick<RequestInit, "signal">): Promise<BreakdownAnalytics> {
  return get<BreakdownAnalytics>("/analytics/by-llm", { signal: init?.signal });
}

export function getAnalyticsByPersona(
  init?: Pick<RequestInit, "signal">,
): Promise<BreakdownAnalytics> {
  return get<BreakdownAnalytics>("/analytics/by-persona", { signal: init?.signal });
}

export function getAnalyticsByFlow(
  init?: Pick<RequestInit, "signal">,
): Promise<BreakdownAnalytics> {
  return get<BreakdownAnalytics>("/analytics/by-flow", { signal: init?.signal });
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

export function getQueryHistory(
  params: {
    page_num?: number;
    page_size?: number;
    start_time?: string;
    end_time?: string;
    user_id?: string;
    feedback_type?: "like" | "dislike";
  } = {},
  init?: Pick<RequestInit, "signal">,
): Promise<QueryHistoryPage> {
  return get<QueryHistoryPage>("/admin/chat-session-history", { params, signal: init?.signal });
}

export function getAuditSummary(
  params: { start_time?: string; end_time?: string } = {},
  init?: Pick<RequestInit, "signal">,
): Promise<AuditSummary> {
  return get<AuditSummary>("/admin/query-history/audit", { params, signal: init?.signal });
}

export function listTools(init?: Pick<RequestInit, "signal">): Promise<ToolView[]> {
  return get<ToolView[]>("/admin/tools", { signal: init?.signal });
}

/**
 * Rank the registered tools against a query (TF-IDF, no LLM).
 *
 * The admin-gated twin of `discoverTools`, which hits the debug router — that
 * router is only mounted when AGENTIC_SEARCH_DEBUG_PANELS is set, so it does not
 * exist in a normal deployment. Use this one outside the dev console.
 */
export function discoverAdminTools(
  query: string,
  init?: Pick<RequestInit, "signal">,
): Promise<ToolDiscoverResult> {
  return post<ToolDiscoverResult>("/admin/tools/discover", {
    body: { query },
    signal: init?.signal,
  });
}

export function registerOpenAPITools(
  req: OpenAPIRegisterRequest,
  init?: Pick<RequestInit, "signal">,
): Promise<OpenAPIRegisterResponse> {
  return post<OpenAPIRegisterResponse>("/admin/tools/openapi", {
    body: req,
    signal: init?.signal,
  });
}

export function deleteOpenAPIProvider(
  providerId: string,
  init?: Pick<RequestInit, "signal">,
): Promise<void> {
  return del<void>(`/admin/tools/openapi/${providerId}`, { signal: init?.signal });
}

export function invokeTool(
  name: string,
  req: ToolInvokeRequest,
  init?: Pick<RequestInit, "signal">,
): Promise<ToolInvokeResponse> {
  return post<ToolInvokeResponse>(`/admin/tools/${name}/invoke`, {
    body: req,
    signal: init?.signal,
  });
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

export function fetchSearchDomains(): Promise<{
  domains: SearchDomainOption[];
}> {
  return get<{ domains: SearchDomainOption[] }>("/api/search-domains");
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
