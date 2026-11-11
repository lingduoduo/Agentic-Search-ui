import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as admin from "../admin";
import * as auth from "../auth";
import * as api from "../api";
import { SESSION_CLEARED_EVENT } from "../../config/session";

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("authentication service", () => {
  it("submits form credentials and returns the current user", async () => {
    const user = { id: "u1", email: "a+b@example.test", role: "basic", is_active: true };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(user)));
    expect(await auth.login(user.email, "p&= word")).toEqual(user);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/x-www-form-urlencoded");
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect(init.body.get("username")).toBe("a+b@example.test");
    expect(init.body.get("password")).toBe("p&= word");
  });

  it("accepts a successful sign-out without a response body", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await auth.logout()).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it.each([
    {
      name: "current user",
      call: () => api.getCurrentUser(),
      path: "/me",
      response: { id: "u1", email: "a@example.test", role: "basic", is_active: true },
    },
    {
      name: "permissions",
      call: () => api.getPermissions(),
      path: "/me/permissions",
      response: ["basic_access"],
    },
  ])("keeps the $name API export compatible", async ({ call, path, response }) => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(response)));
    expect(await call()).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(path, expect.objectContaining({ method: "GET" }));
  });

  it("preserves session clearing on an unauthorized account request", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Session expired" }), { status: 401 }),
    );
    const cleared = vi.fn();
    window.addEventListener(SESSION_CLEARED_EVENT, cleared);
    try {
      await expect(auth.getCurrentUser()).rejects.toMatchObject({
        status: 401,
        message: "Session expired",
      });
      expect(cleared).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener(SESSION_CLEARED_EVENT, cleared);
    }
  });

  it.each([
    {
      name: "login",
      call: (signal: AbortSignal) => auth.login("a@example.test", "sample", { signal }),
    },
    { name: "logout", call: (signal: AbortSignal) => auth.logout({ signal }) },
    { name: "account", call: (signal: AbortSignal) => auth.getCurrentUser({ signal }) },
    { name: "permissions", call: (signal: AbortSignal) => auth.getPermissions({ signal }) },
  ])("does not send a cancelled $name request", async ({ call }) => {
    const controller = new AbortController();
    const reason = new Error("Page closed");
    controller.abort(reason);
    await expect(call(controller.signal)).rejects.toBe(reason);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("administration service", () => {
  it.each([
    { name: "summary", call: () => admin.getAdminSummary(), path: "/admin/observability/summary" },
    { name: "LLM analytics", call: () => admin.getAnalyticsByLLM(), path: "/analytics/by-llm" },
    {
      name: "persona analytics",
      call: () => api.getAnalyticsByPersona(),
      path: "/analytics/by-persona",
    },
    { name: "flow analytics", call: () => api.getAnalyticsByFlow(), path: "/analytics/by-flow" },
    {
      name: "default history",
      call: () => admin.getQueryHistory(),
      path: "/admin/chat-session-history",
    },
    {
      name: "default audit",
      call: () => admin.getAuditSummary(),
      path: "/admin/query-history/audit",
    },
  ])("preserves the $name endpoint", async ({ call, path }) => {
    mockFetch.mockResolvedValue(new Response("{}"));
    await call();
    expect(mockFetch).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("preserves zero-based history pagination and encodes all filters", async () => {
    const response = { items: [], total_items: 0 };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(response)));
    expect(
      await api.getQueryHistory({
        page_num: 0,
        page_size: 10,
        user_id: "a&b",
        start_time: "start",
        end_time: "end",
        feedback_type: "dislike",
      }),
    ).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(
      "/admin/chat-session-history?page_num=0&page_size=10&user_id=a%26b&start_time=start&end_time=end&feedback_type=dislike",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("keeps audit date filters", async () => {
    mockFetch.mockResolvedValue(new Response("{}"));
    await api.getAuditSummary({ start_time: "start", end_time: "end" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/admin/query-history/audit?start_time=start&end_time=end",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it.each([
    { name: "summary", call: (signal: AbortSignal) => admin.getAdminSummary({ signal }) },
    { name: "LLM analytics", call: (signal: AbortSignal) => admin.getAnalyticsByLLM({ signal }) },
    {
      name: "persona analytics",
      call: (signal: AbortSignal) => admin.getAnalyticsByPersona({ signal }),
    },
    { name: "flow analytics", call: (signal: AbortSignal) => admin.getAnalyticsByFlow({ signal }) },
    { name: "history", call: (signal: AbortSignal) => admin.getQueryHistory({}, { signal }) },
    { name: "audit", call: (signal: AbortSignal) => admin.getAuditSummary({}, { signal }) },
  ])("does not send a cancelled $name request", async ({ call }) => {
    const controller = new AbortController();
    controller.abort(new Error("Page closed"));
    await expect(call(controller.signal)).rejects.toThrow("Page closed");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
