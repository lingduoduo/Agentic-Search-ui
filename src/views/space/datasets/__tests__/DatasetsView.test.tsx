import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { DatasetPage, DatasetView } from "../../../../models";
import { DatasetsView } from "../DatasetsView";

const demo: DatasetView = {
  name: "demo",
  path: "data/corpus.jsonl",
  docs: 20,
  domain: "retrieval/ML",
  source: "ML Knowledge Base",
  available: true,
  served: true,
};
const scifact: DatasetView = {
  name: "scifact",
  path: "data/corpus_scifact.jsonl",
  docs: 5183,
  domain: "scientific",
  source: "SciFact Corpus",
  available: false,
  served: false,
};

const page = (list: DatasetView[], current_page = 1, total_page = 1): DatasetPage => ({
  list,
  paginator: { current_page, page_size: 20, total_page, total_record: list.length },
});

function Search() {
  return <output data-testid="search">{useLocation().search}</output>;
}

const renderView = (url = "/space/datasets") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/space/datasets"
          element={
            <>
              <DatasetsView />
              <Search />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.spyOn(api, "getRetrievalStatus").mockRejectedValue(new Error("no status"));
});
afterEach(() => vi.restoreAllMocks());

describe("DatasetsView", () => {
  it("links each corpus to its page, with its label, name, domain, size and path", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(page([demo, scifact]));
    renderView();
    const card = await screen.findByRole("link", { name: /SciFact Corpus/ });
    expect(card).toHaveAttribute("href", "/space/datasets/scifact");
    expect(card).toHaveTextContent(`scifact · scientific · ${(5183).toLocaleString()} docs`);
    expect(card).toHaveTextContent("data/corpus_scifact.jsonl");
    expect(card).toHaveTextContent("File missing");
    expect(screen.getByRole("link", { name: /ML Knowledge Base/ })).toHaveTextContent("Serving");
  });

  it("requests the first page with the URL's search word", async () => {
    const load = vi.spyOn(api, "getDatasets").mockResolvedValue(page([scifact]));
    renderView("/space/datasets?search_word=sci");
    await screen.findByRole("link", { name: /SciFact/ });
    expect(load).toHaveBeenCalledWith(
      { current_page: 1, page_size: 20, search_word: "sci" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("searchbox", { name: "Find a dataset" })).toHaveValue("sci");
  });

  it("searches on submit, through the URL", async () => {
    const load = vi
      .spyOn(api, "getDatasets")
      .mockResolvedValueOnce(page([demo, scifact]))
      .mockResolvedValueOnce(page([]));
    renderView();
    await screen.findByRole("link", { name: /SciFact/ });
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a dataset" }), "zzz{Enter}");
    expect(await screen.findByText("No datasets match.")).toBeInTheDocument();
    expect(screen.getByTestId("search")).toHaveTextContent("?search_word=zzz");
    expect(load).toHaveBeenLastCalledWith(
      { current_page: 1, page_size: 20, search_word: "zzz" },
      expect.anything(),
    );
  });

  it("appends the next page from Load more, skipping a dataset already shown", async () => {
    const load = vi
      .spyOn(api, "getDatasets")
      .mockResolvedValueOnce(page([demo], 1, 2))
      .mockResolvedValueOnce(page([demo, scifact], 2, 2));
    renderView();
    await screen.findByRole("link", { name: /ML Knowledge Base/ });
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("link", { name: /SciFact/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(load).toHaveBeenLastCalledWith(
      { current_page: 2, page_size: 20, search_word: "" },
      expect.anything(),
    );
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("says when no corpus is registered", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(page([]));
    renderView();
    expect(await screen.findByText("No datasets registered.")).toBeInTheDocument();
  });

  it("retries the page that failed", async () => {
    const load = vi
      .spyOn(api, "getDatasets")
      .mockResolvedValueOnce(page([demo], 1, 2))
      .mockRejectedValueOnce(new Error("The corpus manifest could not be parsed."))
      .mockResolvedValueOnce(page([scifact], 2, 2));
    renderView();
    await screen.findByRole("link", { name: /ML Knowledge Base/ });
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The corpus manifest could not be parsed.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry loading datasets" }));
    expect(await screen.findByRole("link", { name: /SciFact/ })).toBeInTheDocument();
    expect(load.mock.calls.map(([params]) => params?.current_page)).toEqual([1, 2, 2]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows which retrieval server answers", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(page([demo]));
    vi.spyOn(api, "getRetrievalStatus").mockResolvedValue({
      url: "http://127.0.0.1:8001",
      embedded: false,
      ok: true,
    });
    renderView();
    expect(await screen.findByText("retrieval · 127.0.0.1:8001 · up")).toBeInTheDocument();
  });
});
