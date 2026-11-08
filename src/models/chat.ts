import type { ToolCallTraceView } from "./tools";

export type ChatRole = "user" | "assistant" | "system" | string;

export interface ChatMessageView {
  role: ChatRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSessionView {
  id: string;
  title: string | null;
  user_id: string | null;
  messages: ChatMessageView[];
}

// ---------------------------------------------------------------------------
// Direct chat/search surfaces
// ---------------------------------------------------------------------------

export type ChatStreamEvent =
  // One generated chunk; the closing `answer` carries the authoritative text.
  | { type: "token"; text: string }
  | { type: "answer"; text: string }
  // `degraded` names why the answer is a fallback (e.g. "model_unavailable").
  | { type: "done"; session_id: string; degraded?: string | null }
  | { type: "error"; detail: string };

export interface SendChatMessageBody {
  session_id?: string;
  message: string;
  stream?: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallTraceView[];
  progress?: string[];
  pending?: boolean;
  degraded?: string | null;
}
