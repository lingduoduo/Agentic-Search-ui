import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../services/api";
import { SessionListView } from "../SessionListView";
import { SessionDetailView } from "../SessionDetailView";
import { SurfaceLayout } from "../SurfaceLayout";
import type { SessionListResponse } from "../../interfaces";

const sessions = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i + 1}`,
  title: `Session ${i + 1}`,
  created_at: "2026-10-01",
  updated_at: "2026-10-02",
}));
const session = {
  id: "s1",
  title: "Saved conversation",
  user_id: null,
  messages: [{ role: "assistant", content: "Saved answer" }],
};

function Location() {
  return (
    <output aria-label="URL">
      {useLocation().pathname}
      {useLocation().search}
    </output>
  );
}
function mount(url = "/chat") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Location />
      <Routes>
        <Route path="/chat" element={<SurfaceLayout />}>
          <Route index element={<SessionListView />} />
          <Route path="new" element={<h3>New workspace</h3>} />
          <Route path=":sessionId" element={<SessionDetailView />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("session list", () => {
  it("paginates and searches recent sessions, resetting the page", async () => {
    vi.spyOn(api, "listSessions").mockResolvedValue({ sessions, has_more: false });
    mount();
    expect(await screen.findByRole("link", { name: "Session 1" })).toHaveAttribute(
      "href",
      "/chat/s1",
    );
    expect(screen.queryByRole("link", { name: "Session 11" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.type(screen.getByRole("searchbox"), "Session 3");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("link", { name: "Session 3" })).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toHaveTextContent("/chat?q=Session+3");
    expect(screen.queryByRole("link", { name: "Session 11" })).not.toBeInTheDocument();
  });

  it("links a list entry to a saved transcript", async () => {
    vi.spyOn(api, "listSessions").mockResolvedValue({ sessions, has_more: true });
    vi.spyOn(api, "getSession").mockResolvedValue(session);
    mount();
    await userEvent.click(await screen.findByRole("link", { name: "Session 1" }));
    expect(await screen.findByText("Saved answer")).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toHaveTextContent("/chat/s1");
    await userEvent.click(screen.getByRole("link", { name: "Back to sessions" }));
    expect(await screen.findByText(/1,000 most recent/)).toBeInTheDocument();
  });

  it("validates IDs and encodes IDs for detail navigation", async () => {
    vi.spyOn(api, "listSessions").mockResolvedValue({ sessions: [], has_more: false });
    vi.spyOn(api, "getSession").mockResolvedValue(session);
    mount();
    await screen.findByText(/No sessions found/);
    await userEvent.click(screen.getByRole("button", { name: "Open saved session" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a session ID.");
    await userEvent.type(screen.getByLabelText("Session ID"), "  a?b#c  ");
    await userEvent.click(screen.getByRole("button", { name: "Open saved session" }));
    expect(await screen.findByText("Saved answer")).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toHaveTextContent("/chat/a%3Fb%23c");
  });

  it("shows loading, a list error, retry, and an empty state", async () => {
    let reject!: (cause: Error) => void;
    vi.spyOn(api, "listSessions")
      .mockImplementationOnce(
        () =>
          new Promise((_, r) => {
            reject = r;
          }),
      )
      .mockResolvedValueOnce({ sessions: [], has_more: false });
    mount();
    expect(screen.getByText("Loading sessions…")).toBeInTheDocument();
    await act(async () => reject(new Error("List unavailable")));
    expect(screen.getByRole("alert")).toHaveTextContent("List unavailable");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/No sessions found/)).toBeInTheDocument();
  });

  it("aborts the request when leaving and ignores its late completion", async () => {
    let signal: AbortSignal | undefined;
    let resolve!: (data: SessionListResponse) => void;
    vi.spyOn(api, "listSessions").mockImplementation((init) => {
      signal = init?.signal ?? undefined;
      return new Promise((r) => {
        resolve = r;
      });
    });
    mount();
    await userEvent.click(screen.getByRole("link", { name: "Start new" }));
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve({ sessions, has_more: false }));
    expect(screen.getByRole("heading", { name: "New workspace" })).toBeInTheDocument();
    expect(screen.queryByText("Session 1")).not.toBeInTheDocument();
  });

  it("clamps invalid page values and restores URL search", async () => {
    vi.spyOn(api, "listSessions").mockResolvedValue({ sessions, has_more: false });
    mount("/chat?q=Session%2012&page=-4");
    expect(await screen.findByRole("link", { name: "Session 12" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("Session 12");
    expect(screen.queryByRole("link", { name: "Session 1" })).not.toBeInTheDocument();
  });
});

describe("session detail", () => {
  it("loads a deep link, reports missing sessions, and retries", async () => {
    vi.spyOn(api, "getSession")
      .mockRejectedValueOnce(new Error("Session not found"))
      .mockResolvedValueOnce(session);
    mount("/chat/s1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Session not found");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Saved conversation" })).toBeInTheDocument();
    expect(screen.getByText("Saved answer")).toBeInTheDocument();
  });

  it("aborts detail requests on unmount", async () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(api, "getSession").mockImplementation((_, init) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => {});
    });
    const view = mount("/chat/s1");
    expect(screen.getByText("Loading session…")).toBeInTheDocument();
    view.unmount();
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
