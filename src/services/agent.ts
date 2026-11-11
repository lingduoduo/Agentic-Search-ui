import type {
  AgentExperienceRequest,
  AgentExperienceResponse,
  SSEEvent,
  ToolApprovalDecision,
  ToolEscalationDecision,
} from "../models";
import { post, stream, type RequestOptions } from "../utils/request";

export function runAgent(
  request: AgentExperienceRequest,
  init?: RequestOptions,
): Promise<AgentExperienceResponse> {
  return post<AgentExperienceResponse>("/api/agent", {
    body: request,
    signal: init?.signal,
  });
}

export function submitToolApproval(
  approvalId: string,
  decision: ToolApprovalDecision,
  init?: RequestOptions,
): Promise<unknown> {
  return post<unknown>(`/api/agent/approvals/${encodeURIComponent(approvalId)}`, {
    body: { decision },
    signal: init?.signal,
  });
}

export function submitToolEscalation(
  escalationId: string,
  decision: ToolEscalationDecision,
  init?: RequestOptions,
): Promise<unknown> {
  return post<unknown>(`/api/agent/escalations/${encodeURIComponent(escalationId)}`, {
    body: { decision },
    signal: init?.signal,
  });
}

export async function* streamAgent(
  request: AgentExperienceRequest,
  init?: RequestOptions,
): AsyncGenerator<SSEEvent> {
  yield* stream<SSEEvent>("/api/agent/stream", { body: request, signal: init?.signal });
}
