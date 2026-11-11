import type {
  AdminSurfaceSummary,
  BreakdownAnalytics,
  QueryHistoryPage,
  QueryHistoryParams,
  AuditSummary,
  AuditSummaryParams,
} from "../models";
import { get, type RequestOptions } from "../utils/request";

export function getAdminSummary(init?: RequestOptions): Promise<AdminSurfaceSummary> {
  return get<AdminSurfaceSummary>("/admin/observability/summary", { signal: init?.signal });
}

export function getAnalyticsByLLM(init?: RequestOptions): Promise<BreakdownAnalytics> {
  return get<BreakdownAnalytics>("/analytics/by-llm", { signal: init?.signal });
}

export function getAnalyticsByPersona(init?: RequestOptions): Promise<BreakdownAnalytics> {
  return get<BreakdownAnalytics>("/analytics/by-persona", { signal: init?.signal });
}

export function getAnalyticsByFlow(init?: RequestOptions): Promise<BreakdownAnalytics> {
  return get<BreakdownAnalytics>("/analytics/by-flow", { signal: init?.signal });
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
