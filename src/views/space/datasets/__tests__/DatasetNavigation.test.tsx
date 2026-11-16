import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import { ListView } from "../ListView";
import { DatasetDetailView, LegacyDatasetRedirect } from "../DatasetDetailView";
import { CreateView } from "../CreateView";

const dataset = {
  name: "demo",
  source: "Demo knowledge base",
  path: null,
  domain: null,
  docs: 45,
  available: true,
  managed: true,
  served: true,
  description: null,
  updated_at: null,
};
function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button onClick={() => void navigate(-1)}>Browser back</button>
      <button onClick={() => void navigate(1)}>Browser forward</button>
      <output data-testid="url">{location.pathname + location.search + location.hash}</output>
    </>
  );
}
function renderView(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Navigation />
      <Routes>
        <Route path="/space/datasets" element={<ListView />} />
        <Route path="/space/datasets/:name" element={<LegacyDatasetRedirect />} />
        <Route path="/space/datasets/:name/documents" element={<DatasetDetailView />} />
        <Route path="/space/datasets/:name/documents/create" element={<CreateView />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.spyOn(api, "getRetrievalStatus").mockRejectedValue(new Error("not available"));
  vi.spyOn(api, "getDatasetQueries").mockResolvedValue([]);
  vi.spyOn(api, "getDatasets").mockResolvedValue({
    list: [dataset],
    paginator: { current_page: 1, page_size: 20, total_page: 1, total_record: 1 },
  });
  vi.spyOn(api, "getDataset").mockResolvedValue(dataset);
  vi.spyOn(api, "getDatasetDocuments").mockImplementation(async (_name, params) => ({
    list: [
      {
        id: "one",
        title: `${params?.search_word || "all"}-${params?.current_page}`,
        document_id: "one",
        contents: "Document text",
        source: null,
        acl: [],
        enabled: true,
        updated_at: null,
      },
    ],
    paginator: {
      current_page: params?.current_page ?? 1,
      page_size: params?.page_size ?? 20,
      total_page: 3,
      total_record: 45,
    },
  }));
});
afterEach(() => vi.restoreAllMocks());

it("loads a document deep link, searches from page one, and restores keywords through browser history", async () => {
  renderView(
    "/space/datasets/demo/documents?search_word=alpha&current_page=2&page_size=50&filter=all#documents",
  );
  expect(await screen.findByText("alpha-2")).toBeInTheDocument();
  const field = screen.getByRole("searchbox", { name: "Find a document" });
  expect(field).toHaveValue("alpha");
  await userEvent.clear(field);
  await userEvent.type(field, " beta {Enter}");
  expect(await screen.findByText("beta-1")).toBeInTheDocument();
  expect(screen.getByTestId("url")).toHaveTextContent(
    "?search_word=beta&page_size=50&filter=all#documents",
  );
  await userEvent.click(screen.getByRole("button", { name: "Browser back" }));
  expect(await screen.findByText("alpha-2")).toBeInTheDocument();
  expect(field).toHaveValue("alpha");
  await userEvent.click(screen.getByRole("button", { name: "Browser forward" }));
  expect(await screen.findByText("beta-1")).toBeInTheDocument();
  expect(field).toHaveValue("beta");
});

it("returns from the upload page to the same document search and page", async () => {
  renderView(
    "/space/datasets/demo/documents?search_word=alpha&current_page=2&page_size=50#documents",
  );
  await userEvent.click(await screen.findByRole("link", { name: "Add files" }));
  expect(await screen.findByLabelText("Files")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("link", { name: "← Back to documents" }));
  expect(await screen.findByText("alpha-2")).toBeInTheDocument();
  expect(screen.getByTestId("url")).toHaveTextContent(
    "/space/datasets/demo/documents?search_word=alpha&current_page=2&page_size=50#documents",
  );
});

it("returns from a knowledge base to its filtered catalog", async () => {
  renderView("/space/datasets?search_word=Demo&filter=managed#catalog");
  await userEvent.click(await screen.findByRole("link", { name: /Demo knowledge base/ }));
  expect(await screen.findByText("all-1")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("link", { name: "← All datasets" }));
  await waitFor(() =>
    expect(screen.getByRole("searchbox", { name: "Find a dataset" })).toHaveValue("Demo"),
  );
  expect(screen.getByTestId("url")).toHaveTextContent(
    "/space/datasets?search_word=Demo&filter=managed#catalog",
  );
});

it("submitting the current keyword starts again at page one", async () => {
  renderView("/space/datasets/demo/documents?search_word=alpha&current_page=2&page_size=50");
  await screen.findByText("alpha-2");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByText("alpha-1")).toBeInTheDocument();
  expect(screen.getByTestId("url")).toHaveTextContent("?search_word=alpha&page_size=50");
});

it("keeps the full location when opening an older dataset bookmark", async () => {
  renderView("/space/datasets/demo?search_word=alpha&current_page=2&page_size=50#documents");
  expect(await screen.findByText("alpha-2")).toBeInTheDocument();
  expect(screen.getByTestId("url")).toHaveTextContent(
    "/space/datasets/demo/documents?search_word=alpha&current_page=2&page_size=50#documents",
  );
});
