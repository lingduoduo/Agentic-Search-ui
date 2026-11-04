import { Bot } from "lucide-react";
import type { ConversationTurn } from "../interfaces";
import { ToolCallTracePanel } from "./ToolCallTracePanel";

/** A turn's avatar, also used by the history panel (SessionTimeline). Decoration:
 *  the turn's name label announces the speaker. */
export function TurnAvatar({ role }: { role: "user" | "assistant" }) {
  return (
    <span className={`turn__avatar turn__avatar--${role}`} aria-hidden="true">
      {role === "user" ? "You" : <Bot size={16} />}
    </span>
  );
}

export function Transcript({ turns }: { turns: ConversationTurn[] }) {
  return (
    <div className="transcript">
      {turns.map((turn, i) => (
        <div key={i} className={`turn turn--${turn.role}`}>
          <TurnAvatar role={turn.role} />
          <div className="turn__body">
            <div className="turn__name">{turn.role === "user" ? "You" : "Assistant"}</div>
            {turn.role === "assistant" &&
              turn.pending &&
              turn.progress &&
              turn.progress.length > 0 && (
                <ul className="turn__progress">
                  {turn.progress.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              )}
            {turn.toolCalls && turn.toolCalls.length > 0 && (
              <ToolCallTracePanel calls={turn.toolCalls} />
            )}
            {turn.content && <div className="turn__content">{turn.content}</div>}
            {turn.role === "assistant" && turn.pending && !turn.content && (
              <div
                className="turn__content turn__typing"
                role="img"
                aria-label="Assistant is responding"
              >
                <span />
                <span />
                <span />
              </div>
            )}
            {turn.role === "assistant" && turn.degraded && (
              <p className="degraded-notice" role="status" title={turn.degraded}>
                ⚠ Model unavailable — degraded answer
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
