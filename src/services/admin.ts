import type { AdminSurfaceSummary, BreakdownAnalytics } from "../models";
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

// Compatibility for callers that imported history via the admin service.
export { getQueryHistory, getAuditSummary } from "./history";
