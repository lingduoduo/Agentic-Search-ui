import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";
import * as agent from "../agent";
import * as chat from "../chat";
import * as history from "../history";
import * as search from "../search";
import * as debug from "../debug";
import * as tools from "../tools";
import * as data from "../data";
import { RequestError } from "../../utils/request";

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("domain service contracts", () => {
  it.each([
    {
      name: "retrieval status",
      call: () => data.getRetrievalStatus(),
      url: "/api/retrieval/status",
      method: "GET",
      body: undefined,
    },
    {
      name: "datasets",
      call: () => data.getDatasets(),
      url: "/api/datasets",
      method: "GET",
      body: undefined,
    },
    {
      name: "dataset page and search",
      call: () => data.getDatasets({ current_page: 2, page_size: 20, search_word: "sci fact" }),
      url: "/api/datasets?current_page=2&page_size=20&search_word=sci+fact",
      method: "GET",
      body: undefined,
    },
    {
      name: "dataset details",
      call: () => data.getDataset("a/b?c"),
      url: "/api/datasets/a%2Fb%3Fc",
      method: "GET",
      body: undefined,
    },
    {
      name: "dataset documents",
      call: () => data.getDatasetDocuments("a/b", { current_page: 3, search_word: "" }),
      url: "/api/datasets/a%2Fb/documents?current_page=3",
      method: "GET",
      body: undefined,
    },
    {
      name: "session details",
      call: () => history.getSession("a/b?c"),
      url: "/api/sessions/a%2Fb%3Fc",
      method: "GET",
      body: undefined,
    },
    {
      name: "session creation defaults",
      call: () => history.createSession(),
      url: "/api/sessions",
      method: "POST",
      body: {},
    },
    {
      name: "approval",
      call: () => agent.submitToolApproval("a/b?c", "deny"),
      url: "/api/agent/approvals/a%2Fb%3Fc",
      method: "POST",
      body: { decision: "deny" },
    },
    {
      name: "escalation",
      call: () => agent.submitToolEscalation("a/b?c", "retry"),
      url: "/api/agent/escalations/a%2Fb%3Fc",
      method: "POST",
      body: { decision: "retry" },
    },
    {
      name: "session feedback defaults",
      call: () => api.submitSessionFeedback("s1", "thumbs_up"),
      url: "/api/feedback",
      method: "POST",
      body: { session_id: "s1", signal: "thumbs_up", target: "overall", source: "answer_panel" },
    },
    {
      name: "session feedback target",
      call: () => api.submitSessionFeedback("s1", "thumbs_down", "retrieval"),
      url: "/api/feedback",
      method: "POST",
      body: {
        session_id: "s1",
        signal: "thumbs_down",
        target: "retrieval",
        source: "answer_panel",
      },
    },
    {
      name: "message feedback defaults",
      call: () => api.submitFeedback("m1", false),
      url: "/chat/create-chat-message-feedback",
      method: "POST",
      body: { chat_message_id: "m1", is_positive: false, feedback_text: null },
    },
    {
      name: "message feedback text",
      call: () => api.submitFeedback("m1", true, "helpful"),
      url: "/chat/create-chat-message-feedback",
      method: "POST",
      body: { chat_message_id: "m1", is_positive: true, feedback_text: "helpful" },
    },
    {
      name: "direct search defaults",
      call: () => api.sendSearchMessage({ search_query: "maps" }),
      url: "/search/send-search-message",
      method: "POST",
      body: { search_query: "maps", num_hits: 8, run_query_expansion: false, stream: false },
    },
    {
      name: "direct search hit count",
      call: () => api.sendSearchMessage({ search_query: "maps", num_hits: 3 }),
      url: "/search/send-search-message",
      method: "POST",
      body: { search_query: "maps", num_hits: 3, run_query_expansion: false, stream: false },
    },
    {
      name: "tool history",
      call: () => api.getToolHistory(),
      url: "/tool/tool-history",
      method: "GET",
      body: undefined,
    },
    {
      name: "debug request details",
      call: () => api.getDebugRequest("a/b?c"),
      url: "/api/debug/request/a%2Fb%3Fc",
      method: "GET",
      body: undefined,
    },
    {
      name: "dataset creation",
      call: () => data.createDataset({ name: "kb", description: "Docs" }),
      url: "/api/datasets",
      method: "POST",
      body: { name: "kb", description: "Docs" },
    },
    {
      name: "dataset update",
      call: () => data.updateDataset("a/b", { domain: null }),
      url: "/api/datasets/a%2Fb",
      method: "PATCH",
      body: { domain: null },
    },
    {
      name: "dataset deletion",
      call: () => data.deleteDataset("kb"),
      url: "/api/datasets/kb",
      method: "DELETE",
      body: undefined,
    },
    {
      name: "dataset import",
      call: () => data.importDataset("demo"),
      url: "/api/datasets/demo/import",
      method: "POST",
      body: undefined,
    },
    {
      name: "document details",
      call: () => data.getDocument("kb", "a/b"),
      url: "/api/datasets/kb/documents/a%2Fb",
      method: "GET",
      body: undefined,
    },
    {
      name: "document update",
      call: () => data.updateDocument("kb", "d1", { title: "T", enabled: false }),
      url: "/api/datasets/kb/documents/d1",
      method: "PATCH",
      body: { title: "T", enabled: false },
    },
    {
      name: "upload batch status",
      call: () => data.getDocumentsStatus("kb", "batch/1"),
      url: "/api/datasets/kb/documents/batch/batch%2F1",
      method: "GET",
      body: undefined,
    },
    {
      name: "document deletion",
      call: () => data.deleteDocument("kb", "d1"),
      url: "/api/datasets/kb/documents/d1",
      method: "DELETE",
      body: undefined,
    },
  ])("preserves $name", async ({ call, url, method, body }) => {
    mockFetch.mockResolvedValue(new Response("{}"));
    await call();
    const [actualUrl, init] = mockFetch.mock.calls[0];
    expect(actualUrl).toBe(url);
    expect(init.method).toBe(method);
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBe(body === undefined ? undefined : JSON.stringify(body));
  });

  it.each([
    {
      name: "server health",
      call: () => debug.getServerHealth(),
      url: "/api/debug/health",
      response: { servers: [{ name: "retrieval", url: "http://localhost", status: "up" }] },
    },
    {
      name: "evaluation results",
      call: () => debug.getEvalResults(),
      url: "/api/debug/eval-results",
      response: { results: [{ name: "eval.json", modified: 1, metrics: { score: 0.9 } }] },
    },
    {
      name: "request list",
      call: () => debug.listDebugRequests(),
      url: "/api/debug/requests",
      response: { requests: [] },
    },
    {
      name: "search domains",
      call: () => search.fetchSearchDomains(),
      url: "/api/search-domains",
      response: { domains: [{ name: "web", description: "General" }], categories: [] },
    },
  ])("returns the $name envelope", async ({ call, url, response }) => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(response)));
    expect(await call()).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(url, expect.objectContaining({ method: "GET" }));
  });

  it.each([
    { name: "server health", call: (signal: AbortSignal) => api.getServerHealth({ signal }) },
    { name: "evaluation results", call: (signal: AbortSignal) => api.getEvalResults({ signal }) },
    { name: "route latency", call: (signal: AbortSignal) => api.getRouteLatency({ signal }) },
    { name: "request list", call: (signal: AbortSignal) => api.listDebugRequests({ signal }) },
    {
      name: "request details",
      call: (signal: AbortSignal) => api.getDebugRequest("r1", { signal }),
    },
    {
      name: "query transform",
      call: (signal: AbortSignal) => api.runQueryTransform("q", { signal }),
    },
    {
      name: "debug retrieval",
      call: (signal: AbortSignal) =>
        api.runDebugRetrieval("sparse", { query: "q", top_k: 3 }, { signal }),
    },
    { name: "retrieval status", call: (signal: AbortSignal) => api.getRetrievalStatus({ signal }) },
    { name: "datasets", call: (signal: AbortSignal) => api.getDatasets({}, { signal }) },
    { name: "dataset details", call: (signal: AbortSignal) => api.getDataset("d", { signal }) },
    {
      name: "dataset documents",
      call: (signal: AbortSignal) => api.getDatasetDocuments("d", {}, { signal }),
    },
    {
      name: "document details",
      call: (signal: AbortSignal) => api.getDocument("d", "x", { signal }),
    },
    {
      name: "search",
      call: (signal: AbortSignal) => api.sendSearchMessage({ search_query: "q" }, { signal }),
    },
    { name: "tool history", call: (signal: AbortSignal) => api.getToolHistory({ signal }) },
  ])("does not send cancelled $name requests", async ({ call }) => {
    const controller = new AbortController();
    const reason = new Error("Page closed");
    controller.abort(reason);
    await expect(call(controller.signal)).rejects.toBe(reason);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("document upload", () => {
  it("posts the files as multipart form data", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ batch: "b1", files: [], done: false })),
    );
    const a = new File(["one"], "a.txt", { type: "text/plain" });
    const b = new File(["{}"], "b.jsonl");

    await expect(data.createDocuments("kb", [a, b])).resolves.toMatchObject({ batch: "b1" });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/datasets/kb/documents");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).getAll("files")).toHaveLength(2);
    // The browser sets the multipart boundary; a JSON Content-Type would break it.
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });
});

describe("shared model streaming", () => {
  it.each([
    {
      name: "chat",
      call: (signal: AbortSignal) => chat.sendChatMessage({ message: "q" }, { signal }).next(),
      status: 400,
    },
    {
      name: "tools",
      call: (signal: AbortSignal) => tools.sendToolMessage({ message: "q" }, { signal }).next(),
      status: 400,
    },
    {
      name: "debug retrieval",
      call: (signal: AbortSignal) =>
        debug.runDebugRetrieval("sparse", { query: "q", top_k: 3 }, { signal }),
      status: 503,
    },
  ])(
    "preserves $name cancellation instead of treating it as an HTTP failure",
    async ({ call, status }) => {
      const controller = new AbortController();
      const reason = new RequestError("Page closed", status);
      controller.abort(reason);
      await expect(call(controller.signal)).rejects.toBe(reason);
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    {
      name: "chat",
      call: () => api.sendChatMessage({ message: "q" }),
      url: "/chat/send-chat-message",
    },
    {
      name: "tools",
      call: () => api.sendToolMessage({ message: "q" }),
      url: "/tool/send-tool-message",
    },
  ])("preserves $name stream bodies and events", async ({ call, url }) => {
    const events =
      'data: {"type":"answer","text":"hello"}\n\ndata: {"type":"done","session_id":"s1"}\n\n';
    mockFetch.mockResolvedValue(
      new Response(events, { headers: { "Content-Type": "text/event-stream" } }),
    );
    const seen = [];
    for await (const event of call()) seen.push(event.type);
    expect(seen).toEqual(["answer", "done"]);
    expect(mockFetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ method: "POST", body: '{"stream":true,"message":"q"}' }),
    );
  });

  it.each([
    { name: "chat", call: () => api.sendChatMessage({ message: "q" }) },
    { name: "tools", call: () => api.sendToolMessage({ message: "q" }) },
  ])("does not report a $name server outage as a missing model", async ({ call }) => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Server down" }), { status: 502 }),
    );
    await expect(call().next()).rejects.toMatchObject({ status: 502, message: "Server down" });
  });
});
