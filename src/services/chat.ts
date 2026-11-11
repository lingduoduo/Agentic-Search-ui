import type { SendChatMessageBody, ChatStreamEvent } from "../models";
import { post, type RequestOptions } from "../utils/request";
import { streamWithModel } from "../utils/modelStream";

export async function* sendChatMessage(
  body: SendChatMessageBody,
  init?: RequestOptions,
): AsyncGenerator<ChatStreamEvent> {
  yield* streamWithModel<ChatStreamEvent>("/chat/send-chat-message", body, init);
}

export function submitFeedback(
  messageId: string,
  isPositive: boolean,
  feedbackText?: string,
  init?: RequestOptions,
): Promise<void> {
  return post<void>("/chat/create-chat-message-feedback", {
    body: {
      chat_message_id: messageId,
      is_positive: isPositive,
      feedback_text: feedbackText ?? null,
    },
    signal: init?.signal,
  });
}
