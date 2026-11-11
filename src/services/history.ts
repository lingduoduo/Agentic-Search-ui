import type {
  ChatSessionView,
  SessionCreateRequest,
  QueryHistoryPage,
  QueryHistoryParams,
  AuditSummary,
  AuditSummaryParams,
  ToolHistoryResponse,
  FeedbackSignal,
  FeedbackTarget,
  SessionFeedbackResponse,
} from "../models";
import { get, post, type RequestOptions } from "../utils/request";

export function createSession(
  request: SessionCreateRequest = {},
  init?: RequestOptions,
): Promise<ChatSessionView> {
  return post<ChatSessionView>("/api/sessions", {
    body: request,
    signal: init?.signal,
  });
}

export function getSession(sessionId: string, init?: RequestOptions): Promise<ChatSessionView> {
  return get<ChatSessionView>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    signal: init?.signal,
  });
}

export function getQueryHistory(
  params: QueryHistoryParams = {},
  init?: RequestOptions,
): Promise<QueryHistoryPage> {
  return get<QueryHistoryPage>("/admin/chat-session-history", { params, signal: init?.signal });
}

export function getAuditSummary(
  params: AuditSummaryParams = {},
  init?: RequestOptions,
): Promise<AuditSummary> {
  return get<AuditSummary>("/admin/query-history/audit", { params, signal: init?.signal });
}

export function getToolHistory(init?: RequestOptions): Promise<ToolHistoryResponse> {
  return get<ToolHistoryResponse>("/tool/tool-history", { signal: init?.signal });
}

/**
 * Session-level thumbs, the signal the SFT and feedback-GRPO loaders read.
 * `target` says whether the sources or the answer were at fault.
 */
export function submitSessionFeedback(
  sessionId: string,
  signal: FeedbackSignal,
  target: FeedbackTarget = "overall",
  init?: RequestOptions,
): Promise<SessionFeedbackResponse> {
  return post<SessionFeedbackResponse>("/api/feedback", {
    body: { session_id: sessionId, signal, target, source: "answer_panel" },
    signal: init?.signal,
  });
}
