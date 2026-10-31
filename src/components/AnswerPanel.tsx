import { lazy, memo, Suspense, useState } from "react";
import { submitSessionFeedback } from "../services/api";
import type { FeedbackSignal, FeedbackTarget, ProgressStep } from "../interfaces";

interface AnswerPanelProps {
  answer: string;
  citations: string[];
  intent?: "search" | "chat" | "tool";
  documentCount?: number;
  toolCallCount?: number;
  progressSteps?: ProgressStep[];
  completedSteps?: ProgressStep[];
  /** When set, the answer gets a thumbs bar that posts session feedback. */
  sessionId?: string | null;
}

type FeedbackState =
  | { phase: "idle" }
  | { phase: "choosing" }
  | { phase: "sending" }
  | { phase: "sent" }
  | { phase: "failed" };

/**
 * Session-level thumbs. A thumbs-up is posted at once as "overall"; a
 * thumbs-down first asks whether the sources or the answer were at fault, so
 * the stored signal can be read apart as a retrieval or a generation complaint.
 */
function FeedbackBar({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<FeedbackState>({ phase: "idle" });

  const send = async (signal: FeedbackSignal, target: FeedbackTarget) => {
    setState({ phase: "sending" });
    try {
      await submitSessionFeedback(sessionId, signal, target);
      setState({ phase: "sent" });
    } catch {
      setState({ phase: "failed" });
    }
  };

  if (state.phase === "sent") {
    return (
      <div className="feedback-bar" role="status">
        Thanks for the feedback.
      </div>
    );
  }

  if (state.phase === "choosing") {
    return (
      <div className="feedback-bar" role="group" aria-label="What was off?">
        <span>What was off?</span>
        <button type="button" autoFocus onClick={() => send("thumbs_down", "retrieval")}>
          Sources
        </button>
        <button type="button" onClick={() => send("thumbs_down", "generation")}>
          Answer
        </button>
        <button type="button" onClick={() => send("thumbs_down", "overall")}>
          Both
        </button>
        <button type="button" onClick={() => setState({ phase: "idle" })}>
          Cancel
        </button>
      </div>
    );
  }

  const busy = state.phase === "sending";
  return (
    <div className="feedback-bar" role="group" aria-label="Rate this answer">
      <span>Was this helpful?</span>
      <button
        type="button"
        aria-label="Helpful"
        disabled={busy}
        onClick={() => send("thumbs_up", "overall")}
      >
        👍
      </button>
      <button
        type="button"
        aria-label="Not helpful"
        disabled={busy}
        onClick={() => setState({ phase: "choosing" })}
      >
        👎
      </button>
      {state.phase === "failed" && (
        <span className="feedback-bar__error">Couldn't send — try again.</span>
      )}
    </div>
  );
}

// react-markdown is most of the answer path's weight and nothing needs it until
// an answer arrives, so it loads as its own chunk. The import starts with this
// module rather than on first render, so it is normally ready before the first
// answer; until then the raw text stands in.
const markdownModule = import("./Markdown");
const Markdown = lazy(() => markdownModule);

function IntentBadge({ intent, citations, documentCount, toolCallCount }: {
  intent: "search" | "chat" | "tool";
  citations: string[];
  documentCount?: number;
  toolCallCount?: number;
}) {
  if (intent === "search") {
    const n = documentCount ?? 0;
    return <span className="intent-badge">Searched · {n} {n === 1 ? "source" : "sources"}</span>;
  }
  if (intent === "chat") {
    const n = citations.length;
    return <span className="intent-badge">Answered · {n} {n === 1 ? "citation" : "citations"}</span>;
  }
  return <span className="intent-badge">Used tools</span>;
}

function ProgressLog({
  steps,
  completedSteps,
}: {
  steps: ProgressStep[];
  completedSteps: ProgressStep[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (steps.length > 0) {
    return (
      <div className="progress-log">
        <div className="progress-log-header">Agent reasoning</div>
        {steps.map((s, i) => (
          <div
            key={`${s.turn}-${i}`}
            className={`progress-step ${s.text.includes("writing") ? "active" : "done"}`}
          >
            {s.text.includes("writing") ? "⟳" : "✓"} Turn {s.turn} · {s.text}
          </div>
        ))}
      </div>
    );
  }

  if (completedSteps.length > 0) {
    const n = completedSteps.length;
    if (!expanded) {
      return (
        <button
          className="progress-summary"
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`show reasoning — ${n} ${n === 1 ? "turn" : "turns"}`}
        >
          <span>&#10003; {n} {n === 1 ? "turn" : "turns"}</span>
          <span className="show-reasoning">show reasoning &#9658;</span>
        </button>
      );
    }
    return (
      <div className="progress-log">
        <div className="progress-log-header">
          Agent reasoning
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="collapse-btn"
            aria-label="hide reasoning"
          >
            &#9660; hide
          </button>
        </div>
        {completedSteps.map((s, i) => (
          <div key={`${s.turn}-${i}`} className="progress-step done">
            &#10003; Turn {s.turn} · {s.text}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export const AnswerPanel = memo(function AnswerPanel({
  answer,
  citations,
  intent,
  documentCount,
  toolCallCount,
  progressSteps = [],
  completedSteps = [],
  sessionId,
}: AnswerPanelProps) {
  if (!answer && progressSteps.length === 0) {
    return (
      <div className="empty-state">
        Results will appear here once the agent retrieves context.
      </div>
    );
  }

  return (
    <article className="answer-panel">
      <ProgressLog steps={progressSteps} completedSteps={completedSteps} />
      {intent && answer && (
        <IntentBadge
          intent={intent}
          citations={citations}
          documentCount={documentCount}
          toolCallCount={toolCallCount}
        />
      )}
      <Suspense fallback={<p>{answer}</p>}>
        <Markdown>{answer}</Markdown>
      </Suspense>
      {answer && sessionId && progressSteps.length === 0 && (
        // Keyed by session and answer so a new answer gets a fresh, un-sent bar.
        <FeedbackBar key={`${sessionId}:${answer}`} sessionId={sessionId} />
      )}
    </article>
  );
});
