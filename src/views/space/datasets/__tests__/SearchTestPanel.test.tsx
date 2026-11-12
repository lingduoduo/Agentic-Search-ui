import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { HitResponse } from "../../../../models";
import { SearchTestPanel } from "../SearchTestPanel";

const response = (extra: Partial<HitResponse> = {}): HitResponse => ({
  query: "dense retrieval",
  top_k: 5,
  latency_ms: 4.2,
  results: [
    {
      id: "doc_001",
      title: "Dense Retrieval with FAISS",
      contents: "Dense retrieval encodes queries as vectors.",
      source: "Vector Search Docs",
      score: 0.61234,
    },
    { id: "doc_009", title: null, contents: "Hybrid.", source: null, score: 0.1 },
  ],
  ...extra,
});

afterEach(() => vi.restoreAllMocks());

describe("SearchTestPanel", () => {
  it("runs a test query and shows scored results, then refreshes recent queries", async () => {
    const recent = vi
      .spyOn(api, "getDatasetQueries")
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          query: "dense retrieval",
          top_k: 10,
          result_count: 2,
          created_at: "2026-11-12T01:00:00Z",
        },
      ]);
    const search = vi.spyOn(api, "hit").mockResolvedValue(response({ top_k: 10 }));
    render(<SearchTestPanel datasetName="demo" />);

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Test query" }),
      " dense retrieval ",
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Results" }), "10");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(search).toHaveBeenCalledWith("demo", { query: "dense retrieval", top_k: 10 });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "2 results for “dense retrieval” in 4.2 ms",
    );
    const items = within(screen.getByRole("list", { name: "Search test results" })).getAllByRole(
      "listitem",
    );
    expect(items[0]).toHaveTextContent("Dense Retrieval with FAISS");
    expect(items[0]).toHaveTextContent("0.612");
    expect(items[0]).toHaveTextContent("doc_001 · Vector Search Docs");
    expect(items[1]).toHaveTextContent("doc_009"); // untitled: falls back to the id
    expect(items[1]).toHaveTextContent("No source");
    expect(await screen.findByRole("button", { name: "dense retrieval" })).toBeInTheDocument();
    expect(recent).toHaveBeenCalledTimes(2);
  });

  it("says when nothing matches", async () => {
    vi.spyOn(api, "getDatasetQueries").mockResolvedValue([]);
    vi.spyOn(api, "hit").mockResolvedValue(response({ query: "zzz", results: [] }));
    render(<SearchTestPanel datasetName="demo" />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Test query" }), "zzz{Enter}");
    expect(await screen.findByRole("status")).toHaveTextContent("No documents match “zzz”.");
  });

  it("runs a recent query again with its result count", async () => {
    vi.spyOn(api, "getDatasetQueries").mockResolvedValue([
      { query: "bm25", top_k: 3, result_count: 1, created_at: null },
    ]);
    const search = vi.spyOn(api, "hit").mockResolvedValue(response({ query: "bm25", top_k: 3 }));
    render(<SearchTestPanel datasetName="demo" />);

    await userEvent.click(await screen.findByRole("button", { name: "bm25" }));

    expect(search).toHaveBeenCalledWith("demo", { query: "bm25", top_k: 3 });
    expect(screen.getByRole("searchbox", { name: "Test query" })).toHaveValue("bm25");
    expect(screen.getByRole("combobox", { name: "Results" })).toHaveValue("3");
  });

  it("does not search a blank query, and shows a server error", async () => {
    vi.spyOn(api, "getDatasetQueries").mockResolvedValue([]);
    const search = vi
      .spyOn(api, "hit")
      .mockRejectedValue(new Error("This dataset has no enabled documents."));
    render(<SearchTestPanel datasetName="demo" />);

    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a query.");
    expect(search).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("searchbox", { name: "Test query" }), "x{Enter}");
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("This dataset has no enabled documents."),
    );
  });

  it("works without recent queries when they fail to load", async () => {
    vi.spyOn(api, "getDatasetQueries").mockRejectedValue(new Error("nope"));
    render(<SearchTestPanel datasetName="demo" />);
    await waitFor(() => expect(api.getDatasetQueries).toHaveBeenCalled());
    expect(screen.queryByRole("list", { name: "Recent queries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
