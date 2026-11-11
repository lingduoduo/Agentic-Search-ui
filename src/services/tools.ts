import { del, get, post, type RequestOptions } from "../utils/request";
import { streamWithModel } from "../utils/modelStream";
import type {
  SendToolMessageBody,
  ToolStreamEvent,
  BaseResponse,
  CreateApiToolProviderRequest,
  GetApiToolProviderResponse,
  GetApiToolProvidersWithPageResponse,
  UpdateApiToolProviderRequest,
  DebugToolsResult,
  ToolDiscoverResult,
  OpenAPIRegisterRequest,
  OpenAPIRegisterResponse,
  ToolInvokeRequest,
  ToolInvokeResponse,
  ToolView,
} from "../models";

// Provider-management API from the sample. These response envelopes and header
// rows differ from the existing admin registry endpoints below.
const providerPath = (providerId: string) => `/api-tools/${encodeURIComponent(providerId)}`;

/** Fetch a page of custom API tool providers, optionally filtered by keyword. */
export function getApiToolProvidersWithPage(
  current_page = 1,
  page_size = 20,
  search_word = "",
  init?: RequestOptions,
): Promise<GetApiToolProvidersWithPageResponse> {
  return get<GetApiToolProvidersWithPageResponse>("/api-tools", {
    params: { current_page, page_size, search_word },
    signal: init?.signal,
  });
}

export function validateOpenAPISchema(
  openapi_schema: string,
  init?: RequestOptions,
): Promise<BaseResponse<unknown>> {
  return post<BaseResponse<unknown>>("/api-tools/validate-openapi-schema", {
    body: { openapi_schema },
    signal: init?.signal,
  });
}

export function createApiToolProvider(
  req: CreateApiToolProviderRequest,
  init?: RequestOptions,
): Promise<BaseResponse<unknown>> {
  return post<BaseResponse<unknown>>("/api-tools", { body: req, signal: init?.signal });
}

/** The provider API uses POST for full updates and deletion. */
export function updateApiToolProvider(
  providerId: string,
  req: UpdateApiToolProviderRequest,
  init?: RequestOptions,
): Promise<BaseResponse<unknown>> {
  return post<BaseResponse<unknown>>(providerPath(providerId), { body: req, signal: init?.signal });
}

export function deleteApiToolProvider(
  providerId: string,
  init?: RequestOptions,
): Promise<BaseResponse<unknown>> {
  return post<BaseResponse<unknown>>(`${providerPath(providerId)}/delete`, {
    signal: init?.signal,
  });
}

export function getApiToolProvider(
  providerId: string,
  init?: RequestOptions,
): Promise<BaseResponse<GetApiToolProviderResponse>> {
  return get<BaseResponse<GetApiToolProviderResponse>>(providerPath(providerId), {
    signal: init?.signal,
  });
}

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
