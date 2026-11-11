/** Filters accepted by the admin history endpoint; page_num is zero-based. */
export type QueryHistoryParams = {
  page_num?: number;
  page_size?: number;
  start_time?: string;
  end_time?: string;
  user_id?: string;
  feedback_type?: "like" | "dislike";
};

export type AuditSummaryParams = {
  start_time?: string;
  end_time?: string;
};

export interface QueryHistoryItem {
  id: string;
  user_id: string | null;
  name: string | null;
  first_user_message: string;
  first_ai_message: string;
  time_created: string;
  feedback_type: "like" | "dislike" | "mixed" | null;
  flow_type: "chat" | "slack";
  conversation_length: number;
  llm_name: string | null;
}

export interface QueryHistoryPage {
  items: QueryHistoryItem[];
  total_items: number;
}

export interface AuditSummary {
  total_sessions: number;
  total_messages: number;
  sessions_with_feedback: number;
  sessions_with_dislike: number;
  dislike_rate: number;
  top_disliked_queries: string[];
}

export type FeedbackSignal = "thumbs_up" | "thumbs_down";

/** What a thumbs is about: the sources, the answer, or the turn as a whole. */
export type FeedbackTarget = "retrieval" | "generation" | "overall";

export interface SessionFeedbackResponse {
  ok: boolean;
}
