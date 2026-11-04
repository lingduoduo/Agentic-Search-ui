import { memo } from "react";
import type { ChatMessageView } from "../interfaces";
import { TurnAvatar } from "./Transcript";

interface SessionTimelineProps {
  messages: ChatMessageView[];
}

export const SessionTimeline = memo(function SessionTimeline({ messages }: SessionTimelineProps) {
  const visible = messages.map((m, i) => ({ m, i })).filter(({ m }) => m.role !== "system");

  if (visible.length === 0) {
    return <div className="empty-state compact">Start a query to create history.</div>;
  }

  return (
    <div className="chat-thread">
      {visible.map(({ m: message, i: origIdx }) => {
        const role = message.role === "user" ? "user" : "assistant";
        const roundsUsed = message.metadata?.rounds_used as number | undefined;
        const numTurns = message.metadata?.num_turns as number | undefined;

        // The transcript's turn layout; chat-row--* stays as this panel's hook.
        return (
          <div
            key={`${message.role}-${origIdx}`}
            className={`turn turn--${role} chat-row chat-row--${role}`}
          >
            <TurnAvatar role={role} />
            <div className="turn__body">
              <div className="turn__name">{role === "user" ? "You" : "Assistant"}</div>
              <div className="turn__content">{message.content}</div>
              {role === "assistant" && (roundsUsed != null || numTurns != null) && (
                <div className="chat-meta">
                  {roundsUsed != null && `${roundsUsed} rounds`}
                  {roundsUsed != null && numTurns != null && " · "}
                  {numTurns != null && `${numTurns} turns`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
