import { clearCredential } from "./auth";

// For a plain request; streams have no timeout, since an agent run can take longer.
const TIME_OUT = 100_000;

// Defaults for every request; per-request options override them. The session is
// an HttpOnly cookie on this origin (the dev server and nginx proxy the backend).
const BASE_FETCH_OPTIONS: RequestInit = { credentials: "same-origin" };

type FetchOptionType = Omit<RequestInit, "body"> & {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: BodyInit | object | null;
};

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

// Appends params before any fragment, skipping empty values.
const buildUrl = (url: string, params: FetchOptionType["params"]) => {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.append(key, String(value));
  });
  const query = search.toString();
  if (!query) return url;
  const [path, fragment] = url.split("#", 2);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${query}${fragment === undefined ? "" : `#${fragment}`}`;
};

// Plain objects are sent as JSON; FormData, URLSearchParams, strings, etc. pass through untouched.
const encodeBody = (body: FetchOptionType["body"], headers: Headers) => {
  if (!body || typeof body !== "object") return body;
  const prototype = Object.getPrototypeOf(body);
  if (prototype !== Object.prototype && prototype !== null) return body as BodyInit;
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
};

// FastAPI reports errors as `{ "detail": "..." }`.
const errorMessage = async (response: Response) => {
  try {
    const error: unknown = await response.json();
    if (error && typeof error === "object" && "detail" in error) {
      if (typeof error.detail === "string" && error.detail) return error.detail;
    }
  } catch {
    // Non-JSON error pages still produce a useful HTTP error.
  }
  return `Request failed with ${response.status}`;
};

/** Sends the request; resolves with an ok response or throws a RequestError. */
const send = async (url: string, { params, body, ...init }: FetchOptionType) => {
  const headers = new Headers(init.headers);
  const response = await globalThis.fetch(buildUrl(url, params), {
    ...BASE_FETCH_OPTIONS,
    ...init,
    headers,
    body: encodeBody(body, headers),
  });
  if (!response.ok) {
    // Any 401 means the session cookie no longer works.
    if (response.status === 401) clearCredential();
    throw new RequestError(await errorMessage(response), response.status);
  }
  return response;
};

const readJson = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new RequestError("The server returned an invalid JSON response.", response.status);
  }
};

export const request = async <T>(url: string, options: FetchOptionType = {}): Promise<T> => {
  const { signal } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new RequestError("Request timed out. Please try again."));
  }, TIME_OUT);

  try {
    const response = await send(url, { ...options, signal: controller.signal });
    // Also discard responses from transports that complete despite cancellation.
    controller.signal.throwIfAborted();
    return await readJson<T>(response);
  } catch (cause) {
    // Report the abort reason (the caller's or the timeout) over a generic AbortError.
    controller.signal.throwIfAborted();
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
};

export const get = <T>(url: string, options: FetchOptionType = {}) =>
  request<T>(url, { ...options, method: "GET" });

export const post = <T>(url: string, options: FetchOptionType = {}) =>
  request<T>(url, { ...options, method: "POST" });

export const patch = <T>(url: string, options: FetchOptionType = {}) =>
  request<T>(url, { ...options, method: "PATCH" });

export const del = <T>(url: string, options: FetchOptionType = {}) =>
  request<T>(url, { ...options, method: "DELETE" });

// One SSE block: its `data:` lines joined, parsed as JSON. Comment-only blocks
// (the backend's `: keepalive`) have no data and yield nothing.
const parseEvent = <T>(block: string): T | undefined => {
  const data: string[] = [];
  block.split("\n").forEach((line) => {
    if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  });
  if (!data.length) return undefined;
  try {
    return JSON.parse(data.join("\n")) as T;
  } catch {
    throw new RequestError("The server returned an invalid stream event.");
  }
};

/** POSTs and yields each server-sent event's JSON data as it arrives. */
export async function* stream<T>(url: string, options: FetchOptionType = {}): AsyncGenerator<T> {
  const response = await send(url, { ...options, method: "POST" });
  if (!response.body) {
    throw new RequestError("The server returned an empty event stream.", response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  try {
    while (!finished) {
      const { value, done } = await reader.read();
      finished = done;
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const event = parseEvent<T>(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event !== undefined) yield event;
      }
    }
  } finally {
    // The caller stopped early: release the connection.
    if (!finished) await reader.cancel().catch(() => {});
  }
}
