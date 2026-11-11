import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { ToolProviderPage, ToolProviderView, ToolView } from "../../../../models";
import { PAGE_SIZE, ToolsView } from "../ToolsView";

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
const LOCAL: ToolProviderView = {
  id: "local",
  name: "local",
  description: "",
  source: "function",
  tools: [tool({}), tool({ name: "fetch_url", description: "Fetch a page.", parameters: {} })],
};
const WEATHER: ToolProviderView = {
  id: PROVIDER,
  name: "Weather API",
  description: "Forecasts by city.",
  source: "openapi",
  tools: [tool({ name: "get_weather", source: "openapi", provider_id: PROVIDER })],
};
const FILES: ToolProviderView = {
  id: "files",
  name: "files",
  description: "",
  source: "mcp",
  tools: [tool({ name: "list_files", source: "mcp", provider_id: "files" })],
};

const page = (list: ToolProviderView[], current_page = 1, total_page = 1): ToolProviderPage => ({
  list,
  paginator: { current_page, page_size: PAGE_SIZE, total_page, total_record: list.length },
});

const cards = () => within(screen.getAllByRole("list")[0]).getAllByRole("button");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ToolsView", () => {
  it("loads the first page of providers as cards", async () => {
    const load = vi.spyOn(api, "getToolProviders").mockResolvedValue(page([LOCAL, WEATHER, FILES]));
    render(<ToolsView />);

    const builtIn = await screen.findByRole("button", { name: /built-in tools/i });
    expect(builtIn).toHaveTextContent("Built-in · 2 tools");
    expect(builtIn).toHaveTextContent("web_search · fetch_url");
    const weather = screen.getByRole("button", { name: /^weather api/i });
    expect(weather).toHaveTextContent("OpenAPI · 1 tool");
    // The provider's description stands in for the tool list when there is one.
    expect(weather).toHaveTextContent("Forecasts by city.");
    expect(screen.getByRole("button", { name: /^files/i })).toHaveTextContent(
      "MCP server · 1 tool",
    );
    expect(screen.getByText("All tools loaded")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith(
      { current_page: 1, page_size: PAGE_SIZE, search_word: "" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("loads the next page on Load more, appending without duplicates", async () => {
    const load = vi
      .spyOn(api, "getToolProviders")
      .mockResolvedValueOnce(page([LOCAL, WEATHER], 1, 2))
      // WEATHER again: the registry changed between pages.
      .mockResolvedValueOnce(page([WEATHER, FILES], 2, 2));
    render(<ToolsView />);
    await screen.findByRole("button", { name: /^weather api/i });
    expect(screen.queryByText("All tools loaded")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByRole("button", { name: /^files/i })).toBeInTheDocument();
    expect(load).toHaveBeenLastCalledWith(
      { current_page: 2, page_size: PAGE_SIZE, search_word: "" },
      expect.anything(),
    );
    expect(cards()).toHaveLength(3);
    expect(screen.getByText("All tools loaded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("loads the next page when the end of the list scrolls into view", async () => {
    let onIntersect: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          onIntersect = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const load = vi
      .spyOn(api, "getToolProviders")
      .mockResolvedValueOnce(page([LOCAL], 1, 2))
      .mockResolvedValueOnce(page([WEATHER], 2, 2));
    render(<ToolsView />);
    await screen.findByRole("button", { name: /built-in tools/i });

    act(() =>
      onIntersect(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );

    expect(await screen.findByRole("button", { name: /^weather api/i })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("searches on the server once typing pauses, starting again from page 1", async () => {
    const load = vi
      .spyOn(api, "getToolProviders")
      .mockResolvedValueOnce(page([LOCAL, WEATHER]))
      .mockResolvedValueOnce(page([WEATHER]))
      .mockResolvedValueOnce(page([]));
    render(<ToolsView />);
    await screen.findByRole("button", { name: /built-in tools/i });

    await userEvent.type(screen.getByRole("searchbox", { name: "Find a tool" }), "weather");
    await waitFor(() =>
      expect(load).toHaveBeenLastCalledWith(
        { current_page: 1, page_size: PAGE_SIZE, search_word: "weather" },
        expect.anything(),
      ),
    );
    await waitFor(() => expect(cards()).toHaveLength(1));
    // One request for the whole word, not one per keystroke.
    expect(load).toHaveBeenCalledTimes(2);

    await userEvent.type(screen.getByRole("searchbox"), " nothing");
    expect(await screen.findByText("No tools match.")).toBeInTheDocument();
  });

  it("says so when nothing is registered", async () => {
    vi.spyOn(api, "getToolProviders").mockResolvedValue(page([]));
    render(<ToolsView />);
    expect(await screen.findByText("No tools registered.")).toBeInTheDocument();
  });

  it("retries the page that failed", async () => {
    const load = vi
      .spyOn(api, "getToolProviders")
      .mockResolvedValueOnce(page([LOCAL], 1, 2))
      .mockRejectedValueOnce(new Error("Backend down"))
      .mockResolvedValueOnce(page([WEATHER], 2, 2));
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Backend down");

    await userEvent.click(screen.getByRole("button", { name: "Retry loading tools" }));

    expect(await screen.findByRole("button", { name: /^weather api/i })).toBeInTheDocument();
    expect(load.mock.calls[2][0]).toMatchObject({ current_page: 2 });
    expect(cards()).toHaveLength(2);
  });

  it("shows a provider's description and tool parameters in the drawer", async () => {
    vi.spyOn(api, "getToolProviders").mockResolvedValue(page([LOCAL, WEATHER]));
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /^weather api/i }));
    const drawer = screen.getByRole("dialog", { name: "Weather API" });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(drawer).toHaveTextContent("Forecasts by city.");
    expect(drawer).toHaveTextContent("Includes 1 tool");
    expect(drawer).toHaveTextContent("queriesarrayRequired");
    expect(drawer).toHaveTextContent("Queries to run.");
    expect(within(drawer).getByRole("button", { name: "Edit tool" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /^weather api/i })).toHaveFocus();
  });

  it("offers no Edit for built-in tools or MCP servers", async () => {
    vi.spyOn(api, "getToolProviders").mockResolvedValue(page([LOCAL, FILES]));
    render(<ToolsView />);
    for (const name of [/built-in tools/i, /^files/i]) {
      await userEvent.click(await screen.findByRole("button", { name }));
      expect(
        within(screen.getByRole("dialog")).queryByRole("button", { name: /edit/i }),
      ).toBeNull();
      await userEvent.keyboard("{Escape}");
    }
  });

  it("opens the invoke dialog from a tool's Test button", async () => {
    vi.spyOn(api, "getToolProviders").mockResolvedValue(page([LOCAL]));
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /built-in tools/i }));
    await userEvent.click(screen.getByRole("button", { name: "Test web_search" }));
    expect(screen.getByRole("dialog", { name: "Invoke web_search" })).toBeInTheDocument();
  });

  it("validates the schema on blur and creates the provider with its headers", async () => {
    const load = vi.spyOn(api, "getToolProviders").mockResolvedValue(page([]));
    const validate = vi
      .spyOn(api, "validateOpenAPISchema")
      .mockRejectedValueOnce(new Error("OpenAPI schema must define at least one path."))
      .mockResolvedValueOnce({
        tools: [
          { name: "get_weather", description: "Weather now", method: "GET", path: "/weather" },
        ],
      });
    const register = vi
      .spyOn(api, "registerOpenAPITools")
      .mockResolvedValue({ provider_id: PROVIDER, tool_names: ["get_weather"] });
    render(<ToolsView />);
    await screen.findByText("No tools registered.");

    await userEvent.click(screen.getByRole("button", { name: "Create tool" }));
    const dialog = screen.getByRole("dialog", { name: "Create tool" });
    await userEvent.type(within(dialog).getByLabelText("Tool name"), "Weather");
    const schemaBox = within(dialog).getByLabelText("OpenAPI schema");

    // Paste, because userEvent.type reads { and [ as key descriptors.
    await userEvent.click(schemaBox);
    await userEvent.paste("{}");
    await userEvent.tab();
    expect(
      await within(dialog).findByText("OpenAPI schema must define at least one path."),
    ).toBeInTheDocument();

    const schema = JSON.stringify({ paths: { "/weather": { get: {} } } });
    await userEvent.clear(schemaBox);
    await userEvent.paste(schema);
    await userEvent.tab();
    const preview = within(dialog).getByRole("table", { name: "Available tools" });
    await waitFor(() => expect(preview).toHaveTextContent("get_weatherWeather nowGET/weather"));
    expect(within(dialog).queryByText(/at least one path/)).toBeNull();
    expect(validate).toHaveBeenLastCalledWith(schema);

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
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("edits a provider from its stored configuration", async () => {
    const load = vi.spyOn(api, "getToolProviders").mockResolvedValue(page([WEATHER]));
    vi.spyOn(api, "getOpenAPIProvider").mockResolvedValue({
      provider_id: PROVIDER,
      name: "Weather API",
      description: "Forecasts by city.",
      openapi_json: '{"paths":{}}',
      headers: { "X-Key": "k" },
    });
    vi.spyOn(api, "validateOpenAPISchema").mockResolvedValue({
      tools: [{ name: "get_weather", description: "Weather", method: "GET", path: "/weather" }],
    });
    const update = vi
      .spyOn(api, "updateOpenAPIProvider")
      .mockResolvedValue({ provider_id: PROVIDER, tool_names: ["get_weather"] });
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /^weather api/i }));
    await userEvent.click(screen.getByRole("button", { name: "Edit tool" }));

    const dialog = screen.getByRole("dialog", { name: "Edit tool" });
    const nameBox = await within(dialog).findByLabelText("Tool name");
    expect(nameBox).toHaveValue("Weather API");
    expect(within(dialog).getByLabelText("OpenAPI schema")).toHaveValue('{"paths":{}}');
    expect(within(dialog).getByLabelText("Header 1 key")).toHaveValue("X-Key");
    // The stored schema is validated on open, so its tools are listed straight away.
    await waitFor(() =>
      expect(within(dialog).getByRole("table", { name: "Available tools" })).toHaveTextContent(
        "get_weather",
      ),
    );

    await userEvent.clear(nameBox);
    await userEvent.type(nameBox, "Weather v2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(update).toHaveBeenCalledWith(PROVIDER, {
      name: "Weather v2",
      openapi_json: '{"paths":{}}',
      headers: { "X-Key": "k" },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("deletes a provider from the edit dialog after confirmation", async () => {
    const load = vi
      .spyOn(api, "getToolProviders")
      .mockResolvedValueOnce(page([LOCAL, WEATHER]))
      .mockResolvedValueOnce(page([LOCAL]));
    vi.spyOn(api, "getOpenAPIProvider").mockResolvedValue({
      provider_id: PROVIDER,
      name: "Weather API",
      description: "",
      openapi_json: "{}",
      headers: {},
    });
    vi.spyOn(api, "validateOpenAPISchema").mockResolvedValue({ tools: [] });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const del = vi.spyOn(api, "deleteOpenAPIProvider").mockResolvedValue(undefined);
    render(<ToolsView />);
    await userEvent.click(await screen.findByRole("button", { name: /^weather api/i }));
    await userEvent.click(screen.getByRole("button", { name: "Edit tool" }));
    const dialog = screen.getByRole("dialog", { name: "Edit tool" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Delete" }));

    expect(del).toHaveBeenCalledWith(PROVIDER);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(load).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("button", { name: /^weather api/i })).toBeNull());
  });
});
