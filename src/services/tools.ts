import { del, get, post, type RequestOptions } from "../utils/request";
import { streamWithModel } from "../utils/modelStream";
import type {
  SendToolMessageBody,
  ToolStreamEvent,
  DebugToolsResult,
  ToolDiscoverResult,
  OpenAPIRegisterRequest,
  OpenAPIRegisterResponse,
  ToolInvokeRequest,
  ToolInvokeResponse,
  ToolView,
} from "../models";

/** Registered tools + the discovery catalog grouped by server (dev console). */
export function getDebugTools(init?: RequestOptions): Promise<DebugToolsResult> {
  return get<DebugToolsResult>("/api/debug/tools", { signal: init?.signal });
}

/** Rank tools for a query via the semantic router (dev console). */
export function discoverTools(query: string, init?: RequestOptions): Promise<ToolDiscoverResult> {
  return post<ToolDiscoverResult>("/api/debug/tools/discover", {
    body: { query },
    signal: init?.signal,
  });
}

export function listTools(init?: RequestOptions): Promise<ToolView[]> {
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
  init?: RequestOptions,
): Promise<ToolDiscoverResult> {
  return post<ToolDiscoverResult>("/admin/tools/discover", {
    body: { query },
    signal: init?.signal,
  });
}

export function registerOpenAPITools(
  req: OpenAPIRegisterRequest,
  init?: RequestOptions,
): Promise<OpenAPIRegisterResponse> {
  return post<OpenAPIRegisterResponse>("/admin/tools/openapi", {
    body: req,
    signal: init?.signal,
  });
}

export function deleteOpenAPIProvider(providerId: string, init?: RequestOptions): Promise<void> {
  return del<void>(`/admin/tools/openapi/${encodeURIComponent(providerId)}`, {
    signal: init?.signal,
  });
}

export function invokeTool(
  name: string,
  req: ToolInvokeRequest,
  init?: RequestOptions,
): Promise<ToolInvokeResponse> {
  return post<ToolInvokeResponse>(`/admin/tools/${encodeURIComponent(name)}/invoke`, {
    body: req,
    signal: init?.signal,
  });
}

export async function* sendToolMessage(
  body: SendToolMessageBody,
  init?: RequestOptions,
): AsyncGenerator<ToolStreamEvent> {
  yield* streamWithModel<ToolStreamEvent>("/tool/send-tool-message", body, init);
}
