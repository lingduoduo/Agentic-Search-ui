import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  managed: false,
  description: null,
  updated_at: null,
};

const managedDataset = {
  ...dataset,
  managed: true,
  description: "Curated ML docs",
  updated_at: "2026-11-12T00:00:00Z",
};

const doc = (id: string, extra: Partial<DatasetDocumentView> = {}): DatasetDocumentView => ({
  id,
  title: `Title ${id}`,
  contents: `Contents of ${id}`,
  source: "Vector Search Docs",
  acl: ["public"],
  document_id: null,
  enabled: true,
  updated_at: null,
  ...extra,
});

const managedDoc = (id: string, extra: Partial<DatasetDocumentView> = {}) =>
  doc(id, { document_id: `row-${id}`, ...extra });

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

// The search test panel loads recent queries on mount.
beforeEach(() => {
  vi.spyOn(api, "getDatasetQueries").mockResolvedValue([]);
});
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

describe("DatasetDetailView management", () => {
  it("imports an unmanaged corpus", async () => {
    vi.spyOn(api, "getDataset")
      .mockResolvedValueOnce(dataset)
      .mockResolvedValueOnce(managedDataset);
    const load = vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([doc("a")]));
    const importIt = vi.spyOn(api, "importDataset").mockResolvedValue(managedDataset);
    renderView();
    expect(
      await screen.findByText("Import this corpus to edit it; its file stays as it is."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Enabled" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Import to manage" }));

    expect(importIt).toHaveBeenCalledWith("demo");
    expect(await screen.findByRole("button", { name: "Edit dataset" })).toBeInTheDocument();
    expect(screen.getByText("Curated ML docs")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("cannot import a corpus whose file is missing", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue({ ...dataset, available: false });
    vi.spyOn(api, "getDatasetDocuments").mockRejectedValue(new Error("missing"));
    renderView();
    expect(await screen.findByRole("button", { name: "Import to manage" })).toBeDisabled();
  });

  it("shows the search test only when the corpus file is there", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValueOnce(dataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    const { unmount } = renderView();
    expect(await screen.findByRole("region", { name: "Search test" })).toBeInTheDocument();
    unmount();

    vi.spyOn(api, "getDataset").mockResolvedValue({ ...dataset, available: false });
    renderView();
    await screen.findByRole("button", { name: "Import to manage" });
    expect(screen.queryByRole("region", { name: "Search test" })).not.toBeInTheDocument();
  });

  it("offers Add documents only on a managed dataset", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValueOnce(dataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    const { unmount } = renderView();
    await screen.findByRole("button", { name: "Import to manage" });
    expect(screen.queryByRole("button", { name: "Add documents" })).not.toBeInTheDocument();
    unmount();

    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Add documents" }));
    expect(screen.getByRole("dialog", { name: "Add documents" })).toBeInTheDocument();
  });

  it("says when search sees changes", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    renderView();
    expect(await screen.findByRole("note")).toHaveTextContent(
      "Search sees changes after the retrieval server restarts with this corpus.",
    );
  });

  it("says nothing when the in-process retriever serves it", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue({ ...managedDataset, served: true });
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    renderView();
    await screen.findByRole("button", { name: "Edit dataset" });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("enables and disables a document from its row", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    vi.spyOn(api, "getDatasetDocuments")
      .mockResolvedValueOnce(page([managedDoc("a"), managedDoc("b", { enabled: false })]))
      .mockResolvedValueOnce(page([managedDoc("a", { enabled: false }), managedDoc("b")]));
    const update = vi.spyOn(api, "updateDocument").mockResolvedValue(managedDoc("a"));
    renderView();
    const a = await screen.findByRole("checkbox", { name: "Enable Title a" });
    expect(a).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Enable Title b" })).not.toBeChecked();
    expect(rows()[1]).toHaveClass("datasets-detail__row--disabled");

    await userEvent.click(a);

    expect(update).toHaveBeenCalledWith("demo", "row-a", { enabled: false });
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Enable Title a" })).not.toBeChecked(),
    );
  });

  it("shows an error when a switch fails", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([managedDoc("a")]));
    vi.spyOn(api, "updateDocument").mockRejectedValue(new Error("Document not found."));
    renderView();
    await userEvent.click(await screen.findByRole("checkbox", { name: "Enable Title a" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Document not found.");
  });

  it("edits a document: renames it, disables it, or deletes it", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    const load = vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([managedDoc("a")]));
    vi.spyOn(api, "getDocument").mockResolvedValue(
      managedDoc("a", { contents: "The full text of a." }),
    );
    const update = vi.spyOn(api, "updateDocument").mockResolvedValue(managedDoc("a"));
    const remove = vi.spyOn(api, "deleteDocument").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Edit Title a" }));
    let dialog = screen.getByRole("dialog", { name: "Document" });
    expect(await within(dialog).findByText("The full text of a.")).toBeInTheDocument();
    expect(api.getDocument).toHaveBeenCalledWith("demo", "row-a", expect.anything());
    await userEvent.clear(within(dialog).getByLabelText("Title"));
    await userEvent.type(within(dialog).getByLabelText("Title"), "Renamed");
    await userEvent.click(within(dialog).getByRole("checkbox"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith("demo", "row-a", { title: "Renamed", enabled: false });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit Title a" }));
    dialog = screen.getByRole("dialog", { name: "Document" });
    await within(dialog).findByText("The full text of a.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(remove).toHaveBeenCalledWith("demo", "row-a");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not save a blank document title", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([managedDoc("a")]));
    vi.spyOn(api, "getDocument").mockResolvedValue(managedDoc("a"));
    const update = vi.spyOn(api, "updateDocument");
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Title a" }));
    const dialog = screen.getByRole("dialog", { name: "Document" });
    await userEvent.clear(await within(dialog).findByLabelText("Title"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(within(dialog).getByText("A document needs a title.")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("edits the dataset and deletes it, returning to the list", async () => {
    vi.spyOn(api, "getDataset").mockResolvedValue(managedDataset);
    vi.spyOn(api, "getDatasetDocuments").mockResolvedValue(page([]));
    const update = vi
      .spyOn(api, "updateDataset")
      .mockResolvedValue({ ...managedDataset, domain: "nlp" });
    const remove = vi.spyOn(api, "deleteDataset").mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true);
    renderView();

    await userEvent.click(await screen.findByRole("button", { name: "Edit dataset" }));
    let dialog = screen.getByRole("dialog", { name: "Edit dataset" });
    expect(within(dialog).getByLabelText("Name")).toBeDisabled();
    expect(within(dialog).getByLabelText("Source label")).toHaveValue("ML Knowledge Base");
    await userEvent.clear(within(dialog).getByLabelText("Domain"));
    await userEvent.type(within(dialog).getByLabelText("Domain"), "nlp");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith("demo", {
      description: "Curated ML docs",
      domain: "nlp",
      source: "ML Knowledge Base",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit dataset" }));
    dialog = screen.getByRole("dialog", { name: "Edit dataset" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(remove).not.toHaveBeenCalled(); // the first confirm was cancelled
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(remove).toHaveBeenCalledWith("demo");
    expect(confirm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("table")).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Dataset demo" })).not.toBeInTheDocument();
  });
});
