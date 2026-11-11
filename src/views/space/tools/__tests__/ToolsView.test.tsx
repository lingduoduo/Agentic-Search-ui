import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { ToolView } from "../../../../models";
import { ToolsView, previewOperations } from "../ToolsView";

const tool = (overrides: Partial<ToolView>): ToolView => ({
  name: "web_search",
  description: "Search the web.",
  parameters: {
    type: "object",
    properties: { queries: { type: "array", description: "Queries to run." } },
    required: ["queries"],
  },
  source: "function",
  provider_id: null,
  agent_callable: true,
  user_scoped: false,
  ...overrides,
});

const PROVIDER = "3f2b9c1e-0000-4000-8000-000000000000";
const TOOLS: ToolView[] = [
  tool({}),
  tool({ name: "fetch_url", description: "Fetch a page.", parameters: {} }),
  tool({
    name: "get_weather",
    description: "Current weather for a city.",
    source: "openapi",
    provider_id: PROVIDER,
    provider_name: "Weather API",
  }),
  // MCP tools carry the server's configured name as provider_id, not an API provider id.
  tool({
    name: "list_files",
    description: "List files.",
    source: "mcp",
    provider_id: "files",
    provider_name: "files",
  }),
];

const cards = () => within(screen.getByRole("list")).getAllByRole("button");

afterEach(() => vi.restoreAllMocks());

describe("ToolsView", () => {
  it("groups the registry into provider cards", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue(TOOLS);
    render(<ToolsView />);
    const builtIn = await screen.findByRole("button", { name: /built-in tools/i });
    expect(builtIn).toHaveTextContent("Built-in · 2 tools");
    expect(builtIn).toHaveTextContent("web_search · fetch_url");
    expect(screen.getByRole("button", { name: /^weather api/i })).toHaveTextContent(
      "OpenAPI · 1 tool",
    );
  });

  it("filters cards by provider or tool text", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue(TOOLS);
    render(<ToolsView />);
    await screen.findByRole("button", { name: /built-in tools/i });
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a tool" }), "weather");
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent(/weather api/i);
    await userEvent.type(screen.getByRole("searchbox"), " nothing");
    expect(screen.getByText("No tools match.")).toBeInTheDocument();
  });

  it("shows each tool's parameters in the drawer, without Delete for built-ins", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue(TOOLS);
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /built-in tools/i }));
    const drawer = screen.getByRole("dialog", { name: "Built-in tools" });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(drawer).toHaveTextContent("Includes 2 tools");
    expect(drawer).toHaveTextContent("queriesarrayRequired");
    expect(drawer).toHaveTextContent("Queries to run.");
    expect(within(drawer).queryByRole("button", { name: /delete/i })).toBeNull();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /built-in tools/i })).toHaveFocus();
  });

  it("falls back to a short id for an OpenAPI provider without provider_name", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue([{ ...TOOLS[2], provider_name: undefined }]);
    render(<ToolsView />);
    expect(
      await screen.findByRole("button", { name: /openapi provider 3f2b9c1e/i }),
    ).toBeInTheDocument();
  });

  it("titles an MCP server card by its name and offers no Delete", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue(TOOLS);
    render(<ToolsView />);
    const card = await screen.findByRole("button", { name: /^files/i });
    expect(card).toHaveTextContent("MCP server · 1 tool");
    await userEvent.click(card);
    const drawer = screen.getByRole("dialog", { name: "files" });
    expect(within(drawer).queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("opens the invoke dialog from a tool's Test button", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue(TOOLS);
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /built-in tools/i }));
    await userEvent.click(screen.getByRole("button", { name: "Test web_search" }));
    expect(screen.getByRole("dialog", { name: "Invoke web_search" })).toBeInTheDocument();
  });

  it("deletes an OpenAPI provider after confirmation", async () => {
    vi.spyOn(api, "listTools").mockResolvedValue(TOOLS);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const del = vi.spyOn(api, "deleteOpenAPIProvider").mockResolvedValue(undefined);
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /^weather api/i }));
    await userEvent.click(screen.getByRole("button", { name: "Delete tool" }));
    expect(del).toHaveBeenCalledWith(PROVIDER);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /^weather api/i })).toBeNull();
  });

  it("registers an OpenAPI schema with its headers, previewing the tools first", async () => {
    const list = vi.spyOn(api, "listTools").mockResolvedValue([]);
    const register = vi
      .spyOn(api, "registerOpenAPITools")
      .mockResolvedValue({ provider_id: PROVIDER, tool_names: ["get_weather"] });
    render(<ToolsView />);
    expect(await screen.findByText("No tools registered.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create tool" }));
    const dialog = screen.getByRole("dialog", { name: "Create tool" });
    await userEvent.type(within(dialog).getByLabelText("Tool name"), "Weather");
    const schema = JSON.stringify({
      paths: { "/weather": { get: { operationId: "get_weather", summary: "Weather now" } } },
    });
    // Paste, because userEvent.type reads { and [ as key descriptors.
    await userEvent.click(within(dialog).getByLabelText("OpenAPI schema"));
    await userEvent.paste(schema);
    const preview = within(dialog).getByRole("table", { name: "Available tools" });
    expect(preview).toHaveTextContent("get_weatherWeather nowGET/weather");

    await userEvent.click(within(dialog).getByRole("button", { name: "+ Add header" }));
    await userEvent.type(within(dialog).getByLabelText("Header 1 key"), "Authorization");
    await userEvent.type(within(dialog).getByLabelText("Header 1 value"), "Bearer x");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(register).toHaveBeenCalledWith({
      name: "Weather",
      openapi_json: schema,
      headers: { Authorization: "Bearer x" },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe("previewOperations", () => {
  it("names operations the way the backend does", () => {
    const ops = previewOperations(
      JSON.stringify({
        paths: {
          "/items/{id}": { delete: {}, parameters: [], post: { operationId: "make-item" } },
          "/": { GET: { description: "Root" } },
        },
      }),
    );
    expect(ops).toEqual([
      {
        name: "delete_items_id",
        description: "DELETE /items/{id}",
        method: "DELETE",
        path: "/items/{id}",
      },
      { name: "make_item", description: "POST /items/{id}", method: "POST", path: "/items/{id}" },
      { name: "get_root", description: "Root", method: "GET", path: "/" },
    ]);
  });

  it("returns null for invalid JSON", () => {
    expect(previewOperations("{nope")).toBeNull();
  });
});
