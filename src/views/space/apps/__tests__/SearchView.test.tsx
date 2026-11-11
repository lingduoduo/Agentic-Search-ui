import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchView } from "../SearchView";
import * as api from "../../../../services/api";

function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <SearchView />
      <output aria-label="Current URL">
        {location.pathname + location.search + location.hash}
      </output>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
}

describe("SearchView", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchSearchDomains").mockResolvedValue({
      domains: [
        { name: "web", description: "General" },
        { name: "news", description: "News" },
      ],
    });
  });
  it("reads linked keywords without automatically searching", async () => {
    const run = vi.spyOn(api, "runAgent");
    render(
      <MemoryRouter initialEntries={["/space/apps/search?search_word=vector+%26+search"]}>
        <SearchView />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Search query")).toHaveValue("vector & search");
    await waitFor(() => expect(api.fetchSearchDomains).toHaveBeenCalled());
    expect(run).not.toHaveBeenCalled();
  });

  it("binds submitted keywords to the URL and follows history navigation", async () => {
    const run = vi.spyOn(api, "runAgent").mockResolvedValue({ documents: [] } as never);
    render(
      <MemoryRouter initialEntries={["/space/apps/search?domain=news&search_word=first#results"]}>
        <SearchPage />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText("Search query");
    fireEvent.change(input, { target: { value: "  vector & search  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(input).not.toBeDisabled());
    expect(screen.getByLabelText("Current URL")).toHaveTextContent(
      "/space/apps/search?domain=news&search_word=vector+%26+search#results",
    );
    expect(input).toHaveValue("vector & search");
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ query: "vector & search", domains: ["news"] }),
    );
    fireEvent.change(input, { target: { value: "unsent draft" } });
    fireEvent.click(screen.getByText("Back"));
    await waitFor(() => expect(input).toHaveValue("first"));
    fireEvent.click(screen.getByText("Forward"));
    await waitFor(() => expect(input).toHaveValue("vector & search"));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("clears an empty keyword from the URL without searching", async () => {
    const run = vi.spyOn(api, "runAgent");
    render(
      <MemoryRouter initialEntries={["/space/apps/search?domain=news&search_word=first"]}>
        <SearchPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "   " } });
    fireEvent.click(screen.getByText("Search"));
    expect(screen.getByLabelText("Current URL").textContent).toBe("/space/apps/search?domain=news");
    expect(screen.getByLabelText("Search query")).toHaveValue("");
    await waitFor(() => expect(api.fetchSearchDomains).toHaveBeenCalled());
    expect(run).not.toHaveBeenCalled();
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
