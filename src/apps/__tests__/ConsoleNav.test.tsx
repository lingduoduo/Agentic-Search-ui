import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderApp } from "./renderApp";

vi.mock("../../services/api", () => ({
  // The session loader reads both before the shell mounts; an admin sees every control.
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "u1",
    email: "admin@example.test",
    role: "admin",
    is_active: true,
  }),
  getPermissions: vi.fn().mockResolvedValue(["basic_access", "full_admin_panel_access"]),
  createSession: vi.fn().mockResolvedValue({ id: "s1", messages: [], title: null, user_id: null }),
  runAgent: vi.fn(),
  streamAgent: vi.fn(),
  // The Assist composer loads the domain taxonomy on mount.
  fetchSearchDomains: vi.fn().mockResolvedValue({ domains: [] }),
  getAdminSummary: vi.fn().mockRejectedValue(new Error("no admin")),
  getAnalyticsByLLM: vi.fn().mockRejectedValue(new Error()),
  getAnalyticsByPersona: vi.fn().mockRejectedValue(new Error()),
  getAnalyticsByFlow: vi.fn().mockRejectedValue(new Error()),
  runDebugRetrieval: vi.fn(),
  getServerHealth: vi.fn().mockResolvedValue({ servers: [] }),
  getEvalResults: vi.fn().mockResolvedValue({ results: [] }),
  getRouteLatency: vi.fn().mockResolvedValue({ routes: [] }),
  getDebugTools: vi.fn().mockResolvedValue({ registered: [], catalog: [] }),
  discoverTools: vi.fn(),
  runQueryTransform: vi.fn(),
  submitSessionFeedback: vi.fn().mockResolvedValue({ ok: true }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // The Console toggle belongs to the Assistant page.
  window.history.replaceState({}, "", "/assist");
});
afterEach(() => vi.unstubAllEnvs());

describe("Console nav (DEBUG_PANELS gate)", () => {
  it("hides the Console toggle when the flag is off", async () => {
    vi.stubEnv("VITE_DEBUG_PANELS", "");
    await renderApp();
    expect(screen.queryByRole("button", { name: /console/i })).not.toBeInTheDocument();
  });

  it("shows the Console toggle and opens the Retrieval Lab when enabled", async () => {
    vi.stubEnv("VITE_DEBUG_PANELS", "1");
    await renderApp();
    const toggle = screen.getByRole("button", { name: /console/i });
    expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByRole("heading", { name: /retrieval lab/i })).toBeInTheDocument();
  });
});
