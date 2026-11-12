import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { DatasetDocumentPage, DatasetDocumentView } from "../../../../models";
import { DatasetDetailView } from "../DatasetDetailView";

const dataset = {
  name: "demo",
  path: "data/corpus.jsonl",
  docs: 20,
  domain: "retrieval/ML",
  source: "ML Knowledge Base",
  available: true,
  served: null,
};

const doc = (id: string, extra: Partial<DatasetDocumentView> = {}): DatasetDocumentView => ({
  id,
  title: `Title ${id}`,
  contents: `Contents of ${id}`,
  source: "Vector Search Docs",
  acl: ["public"],
  ...extra,
});

const page = (
  list: DatasetDocumentView[],
  current_page = 1,
  total_page = 1,
): DatasetDocumentPage => ({
  list,
  paginator: { current_page, page_size: 20, total_page, total_record: list.length },
});

function Search() {
  return <output data-testid="search">{useLocation().search}</output>;
}

const renderView = (url = "/space/datasets/demo") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/space/datasets/:name"
          element={
            <>
              <DatasetDetailView />
              <Search />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

afterEach(() => vi.restoreAllMocks());

describe("DatasetDetailView", () => {
  it("shows the dataset and a table of its documents", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(dataset);
    const load = vi
      .spyOn(api, "getDatasetDocuments")
      .mockResolvedValue(page([doc("doc_001"), doc("doc_002", { acl: [], source: null })]));
    renderView();
    expect(await screen.findByText("ML Knowledge Base")).toBeInTheDocument();
    expect(screen.getByText("demo · retrieval/ML · 20 docs")).toBeInTheDocument();
    await screen.findByRole("table");
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent(
      "doc_001Title doc_001Contents of doc_001Vector Search Docspublic",
    );
    expect(rows()[1]).toHaveTextContent("doc_002Title doc_002Contents of doc_002——");
    expect(load).toHaveBeenCalledWith(
      "demo",
      { current_page: 1, page_size: 20, search_word: "" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("link", { name: "← All datasets" })).toHaveAttribute(
      "href",
      "/space/datasets",
    );
  });

  it("pages through the URL, replacing the rows", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(dataset);
    const load = vi
      .spyOn(api, "getDatasetDocuments")
      .mockResolvedValueOnce(page([doc("a")], 1, 2))
      .mockResolvedValueOnce(page([doc("b")], 2, 2))
      .mockResolvedValueOnce(page([doc("a")], 1, 2));
    renderView();
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "‹ Prev" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next ›" }));
    expect(await screen.findByText("Title b")).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(screen.getByTestId("search")).toHaveTextContent("?current_page=2");
    expect(screen.getByRole("button", { name: "Next ›" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "‹ Prev" }));
    expect(await screen.findByText("Title a")).toBeInTheDocument();
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
    expect(load.mock.calls.map(([, params]) => params?.current_page)).toEqual([1, 2, 1]);
  });

  it("starts a new search from the first page", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(dataset);
    const load = vi
      .spyOn(api, "getDatasetDocuments")
      .mockResolvedValueOnce(page([doc("b")], 2, 3))
      .mockResolvedValueOnce(page([]));
    renderView("/space/datasets/demo?current_page=2");
    await screen.findByText("Title b");
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a document" }), "zzz{Enter}");
    expect(await screen.findByText("No documents match.")).toBeInTheDocument();
    expect(screen.getByTestId("search")).toHaveTextContent("?search_word=zzz");
    expect(load).toHaveBeenLastCalledWith(
      "demo",
      { current_page: 1, page_size: 20, search_word: "zzz" },
      expect.anything(),
    );
  });

  it("says when the dataset has no documents", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(dataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    renderView();
    expect(await screen.findByText("This dataset has no documents.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Document pages" })).not.toBeInTheDocument();
  });

  it("shows a missing file and retries the documents", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue({ ...dataset, available: false });
    const load = vi
      .spyOn(api, "getDatasetDocuments")
      .mockRejectedValueOnce(new Error("The dataset's file is missing on the server."))
      .mockResolvedValueOnce(page([doc("a")]));
    renderView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The dataset's file is missing on the server.",
    );
    expect(await screen.findByText("File missing")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry loading documents" }));
    expect(await screen.findByText("Title a")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shows an unknown dataset's error with a retry", async () => {
    const get = vi
      .spyOn(api, "getDataset")
      .mockRejectedValueOnce(new Error("Dataset not found."))
      .mockResolvedValueOnce(dataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    renderView();
    expect(await screen.findByText("Dataset not found.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry loading the dataset" }));
    expect(await screen.findByText("ML Knowledge Base")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
