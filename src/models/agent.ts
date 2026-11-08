import type { ToolEscalationView, ToolApprovalView, ToolCallTraceView } from "./tools";
import type { SearchSourceProvider, SourceDocumentView } from "./search";
import type { ChatMessageView } from "./chat";

export type AgentMode =
  "search_tool" | "hybrid_search" | "chat_once" | "chat_loop" | "search_agent" | "tool_agent";

export interface AgentExperienceRequest {
  query: string;
  session_id?: string | null;
  user_id?: string | null;
  search_url?: string | null;
  top_k?: number;
  source_provider?: SearchSourceProvider;
  mode?: AgentMode;
  route?: "chat" | "search" | "tool";
  // One of the 20 DOMAIN_REGISTRY source categories; "web" is the default.
  // Honored by auto, search_tool, and hybrid_search; other modes reject a
  // non-web value.
  domain?: string;
  // Up to three categories, fused; mutually exclusive with a non-web domain.
  domains?: string[];
}

export interface ClarificationOptionView {
  route: "chat" | "search" | "tool";
  label: string;
}

export interface ClarificationView {
  question: string;
  options: ClarificationOptionView[];
}

export interface ControlFlowEventView {
  sequence: number;
  timestamp: string;
  turn: number;
  component: string;
  action: string;
  status: "started" | "completed" | "decided" | "skipped" | "failed" | string;
  duration_ms: number | null;
  details: Record<string, string | number | boolean | null>;
}

export interface AutoDomains {
  selected: string[];
  status: "ok" | "unavailable";
}

export interface AgentExperienceResponse {
  auto_domains?: AutoDomains | null;
  session_id: string;
  answer: string;
  citations: string[];
  documents: SourceDocumentView[];
  messages: ChatMessageView[];
  intent?: "search" | "chat" | "tool" | "clarify";
  tool_calls?: ToolCallTraceView[];
  control_flow_trace?: ControlFlowEventView[];
  clarification?: ClarificationView | null;
}

export interface SessionCreateRequest {
  title?: string | null;
  user_id?: string | null;
}

// ---------------------------------------------------------------------------
// SSE streaming types
// ---------------------------------------------------------------------------

export interface SSEProgressEvent {
  type: "progress";
  text: string;
  turn: number;
}

export interface SSEAnswerEvent {
  type: "answer";
  text: string;
}

export interface SSEClaimEvent {
  type: "claim";
  text: string;
}

export interface SSETraceEvent {
  type: "trace";
  event: ControlFlowEventView;
}

export interface SSEApprovalRequiredEvent {
  type: "approval_required";
  approval: ToolApprovalView;
}

export interface SSEEscalationRequiredEvent {
  type: "escalation_required";
  escalation: ToolEscalationView;
}

export interface SSEDoneEvent {
  type: "done";
  session_id: string;
  citations: string[];
  documents: SourceDocumentView[];
  intent?: "search" | "chat" | "tool" | "clarify";
  route?: string | null;
  route_degraded?: string | null;
  tool_calls?: ToolCallTraceView[];
  control_flow_trace?: ControlFlowEventView[];
  request_id?: string;
  clarification?: ClarificationView | null;
  // Categories searched, echoed on multi-category requests.
  domains?: string[];
  auto_domains?: AutoDomains | null;
}

export interface SSEErrorEvent {
  type: "error";
  detail: string;
}

export type SSEEvent =
  | SSEProgressEvent
  | SSEAnswerEvent
  | SSEClaimEvent
  | SSETraceEvent
  | SSEApprovalRequiredEvent
  | SSEEscalationRequiredEvent
  | SSEDoneEvent
  | SSEErrorEvent;

export interface ProgressStep {
  turn: number;
  text: string; // e.g. "search_routing_tool · 5 docs" or "writing answer..."
}
