import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getSession } from "../services/api";
import type { ChatSessionView } from "../interfaces";

export function SessionDetailView() {
  const { sessionId = "" } = useParams();
  const [session, setSession] = useState<ChatSessionView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSession(null);
    setLoading(true);
    setError("");
    getSession(sessionId, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setSession(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load session.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sessionId, attempt]);

  return (
    <section className="session-browser" aria-label="Saved session">
      {loading && <p role="status">Loading session…</p>}
      {error && (
        <div className="error-banner" role="alert">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && session && (
        <>
          <h3>{session.title || "Untitled session"}</h3>
          <p className="session-browser__note">Saved transcript · {session.id}</p>
          {session.messages.length ? (
            <ol className="saved-transcript">
              {session.messages.map((message, index) => (
                <li key={index}>
                  <strong>{message.role}</strong>
                  <p>{message.content}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="session-browser__empty">This session has no messages yet.</p>
          )}
        </>
      )}
    </section>
  );
}
