import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tools from "../tools";
import * as api from "../api";

const mockFetch = vi.fn();
const configuration = {
  name: "Maps",
  icon: "map",
  openapi_schema: '{"openapi":"3.0.0"}',
  headers: [{ key: "X-Example", value: "sample" }],
};

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("API tool provider service", () => {
  it("fetches default pagination and preserves the response envelope", async () => {
    const response = {
      code: "success",
      message: "",
      data: {
        list: [],
        paginator: { current_page: 1, page_size: 20, total_page: 0, total_record: 0 },
      },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(response)));
    expect(await api.getApiToolProvidersWithPage()).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api-tools?current_page=1&page_size=20",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("encodes pagination and keyword filters", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ code: "success", message: "", data: null })),
    );
    await tools.getApiToolProvidersWithPage(2, 10, "maps & weather");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api-tools?current_page=2&page_size=10&search_word=maps+%26+weather",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it.each([
    {
      name: "schema validation",
      call: () => tools.validateOpenAPISchema(configuration.openapi_schema),
      url: "/api-tools/validate-openapi-schema",
      method: "POST",
      body: { openapi_schema: configuration.openapi_schema },
    },
    {
      name: "create",
      call: () => tools.createApiToolProvider(configuration),
      url: "/api-tools",
      method: "POST",
      body: configuration,
    },
    {
      name: "update",
      call: () => tools.updateApiToolProvider("maps/a?b", configuration),
      url: "/api-tools/maps%2Fa%3Fb",
      method: "POST",
      body: configuration,
    },
    {
      name: "delete",
      call: () => tools.deleteApiToolProvider("maps/a?b"),
      url: "/api-tools/maps%2Fa%3Fb/delete",
      method: "POST",
      body: undefined,
    },
    {
      name: "details",
      call: () => tools.getApiToolProvider("maps/a?b"),
      url: "/api-tools/maps%2Fa%3Fb",
      method: "GET",
      body: undefined,
    },
  ])("sends the provider $name contract", async ({ call, url, method, body }) => {
    const response = {
      code: "success",
      message: "",
      data: { ...configuration, id: "maps/a?b", created_at: 1 },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(response)));
    expect(await call()).toEqual(response);
    const [actualUrl, init] = mockFetch.mock.calls[0];
    expect(actualUrl).toBe(url);
    expect(init.method).toBe(method);
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBe(body === undefined ? undefined : JSON.stringify(body));
    if (body) expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it.each([
    {
      name: "list",
      call: (signal: AbortSignal) => tools.getApiToolProvidersWithPage(1, 20, "", { signal }),
    },
    {
      name: "validation",
      call: (signal: AbortSignal) => tools.validateOpenAPISchema("{}", { signal }),
    },
    {
      name: "create",
      call: (signal: AbortSignal) => tools.createApiToolProvider(configuration, { signal }),
    },
    {
      name: "update",
      call: (signal: AbortSignal) => tools.updateApiToolProvider("maps", configuration, { signal }),
    },
    {
      name: "delete",
      call: (signal: AbortSignal) => tools.deleteApiToolProvider("maps", { signal }),
    },
    {
      name: "details",
      call: (signal: AbortSignal) => tools.getApiToolProvider("maps", { signal }),
    },
  ])("does not send a cancelled provider $name request", async ({ call }) => {
    const controller = new AbortController();
    const reason = new Error("Page closed");
    controller.abort(reason);
    await expect(call(controller.signal)).rejects.toBe(reason);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("propagates backend validation errors through the shared request client", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid OpenAPI schema" }), { status: 422 }),
    );
    await expect(tools.validateOpenAPISchema("invalid")).rejects.toMatchObject({
      status: 422,
      message: "Invalid OpenAPI schema",
    });
  });
});

describe("existing tool registry API compatibility", () => {
  it.each([
    {
      name: "inventory",
      call: () => api.listTools(),
      url: "/admin/tools",
      method: "GET",
      body: undefined,
    },
    {
      name: "admin discovery",
      call: () => api.discoverAdminTools("maps"),
      url: "/admin/tools/discover",
      method: "POST",
      body: { query: "maps" },
    },
    {
      name: "debug catalog",
      call: () => api.getDebugTools(),
      url: "/api/debug/tools",
      method: "GET",
      body: undefined,
    },
    {
      name: "debug discovery",
      call: () => api.discoverTools("maps"),
      url: "/api/debug/tools/discover",
      method: "POST",
      body: { query: "maps" },
    },
    {
      name: "registration",
      call: () =>
        api.registerOpenAPITools({
          name: "Maps",
          openapi_json: "{}",
          headers: { "X-Example": "sample" },
        }),
      url: "/admin/tools/openapi",
      method: "POST",
      body: { name: "Maps", openapi_json: "{}", headers: { "X-Example": "sample" } },
    },
    {
      name: "provider deletion",
      call: () => api.deleteOpenAPIProvider("maps/a?b"),
      url: "/admin/tools/openapi/maps%2Fa%3Fb",
      method: "DELETE",
      body: undefined,
    },
    {
      name: "invocation",
      call: () => api.invokeTool("maps/a?b", { arguments: { location: "NYC" } }),
      url: "/admin/tools/maps%2Fa%3Fb/invoke",
      method: "POST",
      body: { arguments: { location: "NYC" } },
    },
  ])("preserves the $name request", async ({ call, url, method, body }) => {
    mockFetch.mockResolvedValue(new Response("{}"));
    await call();
    const [actualUrl, init] = mockFetch.mock.calls[0];
    expect(actualUrl).toBe(url);
    expect(init.method).toBe(method);
    expect(init.body).toBe(body === undefined ? undefined : JSON.stringify(body));
  });
});
