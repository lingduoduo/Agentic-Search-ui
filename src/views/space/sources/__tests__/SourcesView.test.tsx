import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import { SourcesView } from "../SourcesView";

const payload = {
  domains: [
    { name: "web", description: "General", category: "" },
    {
      name: "academic",
      description: "Papers, preprints",
      category: "research",
      typical_sources: ["arXiv", "OpenAlex", "Semantic Scholar"],
      source_sites: ["arxiv.org", "openreview.net"],
      tools: ["search_arxiv"],
    },
    {
      name: "official",
      description: "Official announcements",
      category: "government",
      source_sites: [],
      tools: [],
    },
    {
      name: "financial",
      description: "Market data, filings",
      category: "business",
      source_sites: ["sec.gov"],
      tools: ["get_stock_quote", "convert_currency"],
    },
  ],
  categories: [
    { category: "research", name: "Research" },
    { category: "government", name: "Government & law" },
    { category: "business", name: "Business & money" },
  ],
};

const cards = () => within(screen.getByRole("list")).getAllByRole("button");

afterEach(() => vi.restoreAllMocks());

describe("SourcesView", () => {
  it("lists every category but web as a card with its family and counts", async () => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    const academic = await screen.findByRole("button", { name: /academic/i });
    expect(academic).toHaveTextContent("Research · 2 sites · 1 tool");
    expect(screen.getByRole("button", { name: /official/i })).toHaveTextContent(
      "Government & law · Open web",
    );
    expect(cards()).toHaveLength(3);
  });

  it("filters by family pill and by name", async () => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    await screen.findByRole("button", { name: /academic/i });
    const pills = screen.getByRole("group", { name: "Source families" });

    await userEvent.click(within(pills).getByRole("button", { name: "Business & money" }));
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent(/financial/i);

    await userEvent.click(within(pills).getByRole("button", { name: "All" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a source" }), "papers");
    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent(/academic/i);

    await userEvent.type(screen.getByRole("searchbox"), " nothing");
    expect(screen.getByText("No search sources match.")).toBeInTheDocument();
  });

  it("opens a drawer with sites and tools, and closes it on Escape", async () => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    const card = await screen.findByRole("button", { name: /financial/i });
    await userEvent.click(card);

    const drawer = screen.getByRole("dialog", { name: /financial/i });
    expect(within(drawer).getByRole("link", { name: "sec.gov" })).toHaveAttribute(
      "href",
      "https://sec.gov",
    );
    expect(drawer).toHaveTextContent("stock quote");
    expect(drawer).toHaveTextContent("convert currency");
    expect(within(drawer).getByRole("button", { name: "Close" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it("explains a category without a site list", async () => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    await userEvent.click(await screen.findByRole("button", { name: /official/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("No site list");
  });

  it("shows a load error and retries", async () => {
    const fetch = vi
      .spyOn(api, "fetchSearchDomains")
      .mockRejectedValueOnce(new Error("Gateway Timeout"))
      .mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    expect(await screen.findByRole("alert")).toHaveTextContent("Gateway Timeout");
    await userEvent.click(screen.getByRole("button", { name: "Retry loading search sources" }));
    expect(await screen.findByRole("button", { name: /academic/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("aborts the request when the page closes", async () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(api, "fetchSearchDomains").mockImplementation((s) => {
      signal = s;
      return new Promise(() => {});
    });
    const { unmount } = render(<SourcesView />, { wrapper: MemoryRouter });
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("links to Search with the category preselected", async () => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    await userEvent.click(await screen.findByRole("button", { name: /academic/i }));
    expect(screen.getByRole("link", { name: "Search with this" })).toHaveAttribute(
      "href",
      "/space/apps/search?domain=academic",
    );
  });

  it("keeps Tab inside the open drawer", async () => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue(payload);
    render(<SourcesView />, { wrapper: MemoryRouter });
    await userEvent.click(await screen.findByRole("button", { name: /financial/i }));
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("link", { name: "sec.gov" })).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Search with this" })).toHaveFocus();
  });
});
