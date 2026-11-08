import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchView } from "../SearchView";
import * as api from "../../../../services/api";

describe("SearchView", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue({
      domains: [
        { name: "web", description: "General" },
        { name: "news", description: "News" },
      ],
    });
  });
  it("renders returned docs", async () => {
    vi.spyOn(api, "runAgent").mockResolvedValue({
      documents: [{ title: "FAISS overview", url: null, content: "…", score: 1, metadata: {} }],
    } as never);
    render(<SearchView />, { wrapper: MemoryRouter });
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "faiss" } });
    fireEvent.click(screen.getByText("Search"));
    expect(api.runAgent).toHaveBeenCalledWith({
      query: "faiss",
      mode: "search_tool",
      top_k: 8,
      domains: ["web"],
    });
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /FAISS overview/ })).toBeInTheDocument(),
    );
  });
  it("sends the selected category to the search-only endpoint", async () => {
    const run = vi.spyOn(api, "runAgent").mockResolvedValue({ documents: [] } as never);
    render(<SearchView />, { wrapper: MemoryRouter });
    fireEvent.click(screen.getByRole("button", { name: /sources:/i }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "news" }));
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "today" } });
    fireEvent.click(screen.getByText("Search"));
    await waitFor(() =>
      expect(run).toHaveBeenCalledWith({
        query: "today",
        mode: "search_tool",
        top_k: 8,
        domains: ["news"],
      }),
    );
  });

  it("preselects the category from ?domain=", async () => {
    const run = vi.spyOn(api, "runAgent").mockResolvedValue({ documents: [] } as never);
    render(
      <MemoryRouter initialEntries={["/space/apps/search?domain=news"]}>
        <SearchView />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /sources: news/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "today" } });
    fireEvent.click(screen.getByText("Search"));
    await waitFor(() =>
      expect(run).toHaveBeenCalledWith({
        query: "today",
        mode: "search_tool",
        top_k: 8,
        domains: ["news"],
      }),
    );
  });
});
