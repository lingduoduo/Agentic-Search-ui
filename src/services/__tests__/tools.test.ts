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
