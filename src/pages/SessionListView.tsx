import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { listSessions } from "../services/api";
import { useRoute } from "../hooks/useRoute";
import type { SessionListResponse } from "../interfaces";

const PAGE_SIZE = 10;

export function SessionListView() {
  const surface = useRoute();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const requestedPage = Number(params.get("page") ?? 1);
  const [searchInput, setSearchInput] = useState(search);
  const [sessionId, setSessionId] = useState("");
  const [idError, setIdError] = useState("");
  const [data, setData] = useState<SessionListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listSessions({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load sessions.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, surface]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.sessions ?? []).filter((session) =>
      `${session.title ?? ""} ${session.id}`.toLowerCase().includes(query),
    );
  }, [data, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    totalPages,
  );
  const sessions = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changePage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  return (
    <section className="session-browser" aria-label="Saved sessions">
      <div className="session-browser__heading">
        <div>
          <h3>Saved sessions</h3>
          <p>Browse recent sessions shared across Assistant, Search, Chat, and Tools.</p>
        </div>
        <Link className="session-action" to={`${surface}/new`}>
          Start new
        </Link>
      </div>
      <form
        className="session-browser__search"
        aria-label="Search sessions"
        onSubmit={(event) => {
          event.preventDefault();
          const next = new URLSearchParams(params);
          if (searchInput.trim()) next.set("q", searchInput.trim());
          else next.delete("q");
          next.delete("page");
          setParams(next);
        }}
      >
        <input
          type="search"
          aria-label="Search recent sessions"
          placeholder="Search recent sessions by title or ID"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" disabled={loading}>
          Search
        </button>
      </form>
      {loading && <p role="status">Loading sessions…</p>}
      {error && (
        <div className="error-banner" role="alert">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          {data?.has_more && (
            <p className="session-browser__note">
              Showing the 1,000 most recent sessions. Open older sessions by ID.
            </p>
          )}
          {sessions.length ? (
            <ul className="session-list">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link to={`${surface}/${encodeURIComponent(session.id)}`}>
                    {session.title || "Untitled session"}
                  </Link>
                  <p>{session.id}</p>
                  {session.updated_at && (
                    <time dateTime={session.updated_at}>
                      Updated {session.updated_at.slice(0, 10)}
                    </time>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="session-browser__empty">
              No sessions found. Start a new session or open one by ID.
            </p>
          )}
          {totalPages > 1 && (
            <nav className="session-pagination" aria-label="Session pages">
              <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => changePage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
      <form
        className="session-browser__open"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const id = sessionId.trim();
          if (!id) {
            setIdError("Enter a session ID.");
            return;
          }
          if (id === "." || id === ".." || id === "new") {
            setIdError("Enter a saved session ID, not a reserved route name.");
            return;
          }
          setIdError("");
          void navigate(`${surface}/${encodeURIComponent(id)}`);
        }}
      >
        <label htmlFor="session-id">Session ID</label>
        <input
          id="session-id"
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          placeholder="Enter session ID"
          aria-invalid={Boolean(idError)}
          aria-describedby={idError ? "session-id-error" : undefined}
          required
        />
        {idError && (
          <p id="session-id-error" role="alert">
            {idError}
          </p>
        )}
        <button type="submit">Open saved session</button>
      </form>
    </section>
  );
}
