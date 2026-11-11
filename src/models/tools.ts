export interface ToolView {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  source: "function" | "openapi" | "mcp" | string;
  provider_id: string | null;
  /** False when no agent loop may be offered this tool (still directly invocable). */
  agent_callable: boolean;
  /** True when the tool is backed by per-user storage and needs a signed-in caller. */
  user_scoped: boolean;
}

export interface CatalogTool {
  name: string;
  description: string;
  source: string;
  server: string;
  /**
   * Optional: the /admin/tools payload carries these, the /api/debug/tools
   * catalog does not (its ToolDefinition has no such fields). Undefined means
   * "unknown", so the badges are simply not rendered.
   */
  agent_callable?: boolean;
  user_scoped?: boolean;
}

export interface CatalogServer {
  name: string;
  description: string;
  tools: CatalogTool[];
}

export interface DebugToolsResult {
  registered: ToolView[];
  catalog: CatalogServer[];
}

export interface ToolDiscoverResult {
  request: string;
  stage1_servers: { name: string; score: number }[];
  stage2_tools: Record<string, { server_score: number; tools: [string, number][] }>;
  final_tools: { name: string; server: string; score: number }[];
}

export interface OpenAPIRegisterRequest {
  name: string;
  openapi_json: string;
  headers?: Record<string, string>;
}

export interface OpenAPIRegisterResponse {
  provider_id: string;
  tool_names: string[];
}

export interface ToolInvokeRequest {
  arguments: Record<string, unknown>;
}

export interface ToolInvokeResponse {
  response: string;
  raw: unknown;
  errors: string[];
}

export interface ToolSessionSummary {
  session_id: string;
  title: string;
  created_at: string;
}

export type ToolStreamEvent =
  | { type: "progress"; turn: number; text: string }
  | ({ type: "tool_call" } & ToolCallTraceView)
  | { type: "answer"; text: string }
  | { type: "approval_required"; approval: ToolApprovalView }
  | { type: "escalation_required"; escalation: ToolEscalationView }
  | {
      type: "done";
      session_id: string;
      tool_calls: ToolCallTraceView[];
      num_turns: number;
      // The answer is a fragment: a generation hit the wall-clock stop.
      truncated?: boolean;
      // Why the answer is a fallback (e.g. "model_unavailable"); absent/null when not.
      degraded?: string | null;
    }
  | { type: "error"; detail: string };

export interface SendToolMessageBody {
  session_id?: string;
  message: string;
  run_search_tool?: boolean;
  stream?: boolean;
}

export interface ToolEscalationView {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  category: string;
  message: string;
  attempts: number;
  expires_at: string;
}

export interface ToolApprovalView {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  expires_at: string;
}

export interface ToolCallTraceView {
  tool_name: string;
  status: "completed" | "failed";
  arguments: Record<string, unknown>;
  result_summary: string;
  latency_ms: number;
  error: string | null;
}
