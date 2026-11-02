import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_CLEARED_EVENT } from "../../config/session";
import { RequestError, get, patch, post, stream } from "../request";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function stubFetch(respond: (input: string, init: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (input: string, init: RequestInit) => respond(input, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A fetch that only settles when its signal aborts. */
const hangingFetch = (_input: string, init: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });

function sseResponse(chunks: string[], onCancel?: () => void) {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(encoder.encode(chunks[index++]));
      else controller.close();
    },
    cancel: onCancel,
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("request", () => {
  it("appends params before the fragment and skips empty ones", async () => {
    const fetchMock = stubFetch(() => json({ ok: true }));
    await get("/admin/history?x=1#top", {
      params: { page_num: 2, start_time: "", user_id: undefined, active: false },
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/admin/history?x=1&page_num=2&active=false#top");
  });

  it("sends plain objects as JSON with the session cookie, and other bodies untouched", async () => {
    const fetchMock = stubFetch(() => json({}));
    await post("/api/feedback", { body: { signal: "like" } });
    await post("/auth/login", { body: new URLSearchParams({ username: "a" }) });

    const [, jsonInit] = fetchMock.mock.calls[0];
    expect(jsonInit).toMatchObject({ method: "POST", credentials: "same-origin" });
    expect(jsonInit.body).toBe('{"signal":"like"}');
    expect(new Headers(jsonInit.headers).get("Content-Type")).toBe("application/json");

    const [, formInit] = fetchMock.mock.calls[1];
    expect(formInit.body).toBeInstanceOf(URLSearchParams);
    expect(new Headers(formInit.headers).has("Content-Type")).toBe(false);
  });

  it("sends patch as a PATCH with a JSON body", async () => {
    const fetchMock = stubFetch(() => json({ id: "g1" }));
    await expect(patch("/admin/user-group/g1", { body: { name: "Ops" } })).resolves.toEqual({
      id: "g1",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/admin/user-group/g1");
    expect(init).toMatchObject({ method: "PATCH", body: '{"name":"Ops"}' });
  });

  it("rejects with FastAPI's detail and the status, or a generic message", async () => {
    stubFetch(() => json({ detail: "Invalid credentials." }, 400));
    await expect(post("/auth/login")).rejects.toMatchObject({
      name: "RequestError",
      message: "Invalid credentials.",
      status: 400,
    });

    stubFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(get("/me")).rejects.toThrow("Request failed with 502");
  });

  it("signs the app out on a 401", async () => {
    stubFetch(() => json({ detail: "Unauthorized" }, 401));
    const cleared = vi.fn();
    window.addEventListener(SESSION_CLEARED_EVENT, cleared);
    await expect(get("/me")).rejects.toBeInstanceOf(RequestError);
    window.removeEventListener(SESSION_CLEARED_EVENT, cleared);
    expect(cleared).toHaveBeenCalledOnce();
  });

  it("returns undefined for 204 and rejects a 2xx that is not JSON", async () => {
    stubFetch(() => new Response(null, { status: 204 }));
    await expect(post("/auth/logout")).resolves.toBeUndefined();

    stubFetch(() => new Response("not json", { status: 200 }));
    await expect(get("/me")).rejects.toThrow("invalid JSON");
  });

  it("times out with a RequestError", async () => {
    vi.useFakeTimers();
    stubFetch(hangingFetch);
    const pending = expect(get("/api/agent")).rejects.toThrow("Request timed out");
    await vi.advanceTimersByTimeAsync(100_000);
    await pending;
  });

  it("rejects with the caller's abort reason", async () => {
    stubFetch(hangingFetch);
    const controller = new AbortController();
    const pending = get("/me", { signal: controller.signal });
    controller.abort(new Error("left the page"));
    await expect(pending).rejects.toThrow("left the page");
  });
});

describe("stream", () => {
  it("yields each event's data across chunk boundaries and skips keepalives", async () => {
    const fetchMock = stubFetch(() =>
      sseResponse([': keepalive\n\ndata: {"type":"cla', 'im"}\n\n', 'data: {"type":"answer"}\n\n']),
    );
    const types: string[] = [];
    for await (const event of stream<{ type: string }>("/api/agent/stream", { body: { q: 1 } })) {
      types.push(event.type);
    }
    expect(types).toEqual(["claim", "answer"]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: '{"q":1}' });
  });

  it("releases the connection when the caller stops early", async () => {
    const onCancel = vi.fn();
    stubFetch(() =>
      sseResponse(['data: {"n":1}\n\n', 'data: {"n":2}\n\n', 'data: {"n":3}\n\n'], onCancel),
    );
    for await (const event of stream<{ n: number }>("/chat/send-chat-message")) {
      if (event.n === 1) break;
    }
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("rejects before streaming when the response is not ok", async () => {
    stubFetch(() => json({ detail: "No local model" }, 400));
    await expect(stream("/tool/send-tool-message").next()).rejects.toMatchObject({ status: 400 });
  });
});
