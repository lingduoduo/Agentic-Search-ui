import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("tool registry API", () => {
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
      name: "provider page",
      call: () => api.getToolProviders({ current_page: 2, page_size: 10, search_word: "maps & x" }),
      url: "/admin/tools/providers?current_page=2&page_size=10&search_word=maps+%26+x",
      method: "GET",
      body: undefined,
    },
    {
      name: "schema validation",
      call: () => api.validateOpenAPISchema("{}"),
      url: "/admin/tools/openapi/validate",
      method: "POST",
      body: { openapi_json: "{}" },
    },
    {
      name: "provider detail",
      call: () => api.getOpenAPIProvider("maps/a?b"),
      url: "/admin/tools/openapi/maps%2Fa%3Fb",
      method: "GET",
      body: undefined,
    },
    {
      name: "provider update",
      call: () =>
        api.updateOpenAPIProvider("maps/a?b", { name: "Maps", openapi_json: "{}", headers: {} }),
      url: "/admin/tools/openapi/maps%2Fa%3Fb",
      method: "PUT",
      body: { name: "Maps", openapi_json: "{}", headers: {} },
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
