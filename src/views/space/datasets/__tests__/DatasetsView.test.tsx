import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { DatasetView } from "../../../../models";
import { DatasetsView } from "../DatasetsView";

const datasets: DatasetView[] = [
  {
    name: "demo",
    path: "data/corpus.jsonl",
    docs: 20,
    domain: "retrieval/ML",
    source: "ML Knowledge Base",
    available: true,
    served: true,
  },
  {
    name: "scifact",
    path: "data/corpus_scifact.jsonl",
    docs: 5183,
    domain: "scientific",
    source: "SciFact Corpus",
    available: false,
    served: false,
  },
];

const cards = () => within(screen.getByRole("list")).queryAllByRole("article");

beforeEach(() => {
  vi.spyOn(api, "getRetrievalStatus").mockRejectedValue(new Error("no status"));
});
afterEach(() => vi.restoreAllMocks());

describe("DatasetsView", () => {
  it("shows each corpus with its label, name, domain, size and path", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(datasets);
    render(<DatasetsView />);
    const scifact = await screen.findByRole("article", { name: "scifact" });
    expect(scifact).toHaveTextContent("SciFact Corpus");
    expect(scifact).toHaveTextContent(`scifact · scientific · ${(5183).toLocaleString()} docs`);
    expect(scifact).toHaveTextContent("data/corpus_scifact.jsonl");
    expect(cards()).toHaveLength(2);
  });

  it("marks the corpus being served and one whose file is missing", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(datasets);
    render(<DatasetsView />);
    const demo = await screen.findByRole("article", { name: "demo" });
    expect(within(demo).getByText("Serving")).toBeInTheDocument();
    expect(within(demo).queryByText("File missing")).not.toBeInTheDocument();
    const scifact = screen.getByRole("article", { name: "scifact" });
    expect(within(scifact).getByText("File missing")).toBeInTheDocument();
    expect(within(scifact).queryByText("Serving")).not.toBeInTheDocument();
  });

  it("filters by name, label or domain", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(datasets);
    render(<DatasetsView />);
    await screen.findByRole("article", { name: "demo" });
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a dataset" }), "scientific");
    expect(cards().map((card) => card.getAttribute("aria-label"))).toEqual(["scifact"]);
    await userEvent.clear(screen.getByRole("searchbox", { name: "Find a dataset" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a dataset" }), "nothing");
    expect(cards()).toHaveLength(0);
    expect(screen.getByText("No datasets match.")).toBeInTheDocument();
  });

  it("says when no corpus is registered", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue([]);
    render(<DatasetsView />);
    expect(await screen.findByText("No datasets registered.")).toBeInTheDocument();
  });

  it("shows the error and retries", async () => {
    const load = vi
      .spyOn(api, "getDatasets")
      .mockRejectedValueOnce(new Error("The corpus manifest could not be parsed."))
      .mockResolvedValueOnce(datasets);
    render(<DatasetsView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The corpus manifest could not be parsed.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry loading datasets" }));
    expect(await screen.findByRole("article", { name: "demo" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows which retrieval server answers", async () => {
    vi.spyOn(api, "getDatasets").mockResolvedValue(datasets);
    vi.spyOn(api, "getRetrievalStatus").mockResolvedValue({
      url: "http://127.0.0.1:8001",
      embedded: false,
      ok: true,
    });
    render(<DatasetsView />);
    expect(await screen.findByText("retrieval · 127.0.0.1:8001 · up")).toBeInTheDocument();
  });
});
