import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import { CreateView } from "../CreateView";

const dataset = {
  name: "demo",
  path: null,
  docs: 0,
  domain: null,
  source: "Demo",
  available: true,
  served: false,
  managed: true,
  description: null,
  updated_at: null,
};

function renderView() {
  return render(
    <MemoryRouter initialEntries={["/space/datasets/demo/documents/create"]}>
      <Routes>
        <Route path="/space/datasets/:name/documents/create" element={<CreateView />} />
        <Route path="/space/datasets/:name" element={<p>Document list</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

it("reviews selected files before uploading and returns to the document list", async () => {
  vi.spyOn(api, "getDataset").mockResolvedValue(dataset);
  const files = [new File(["hello world"], "notes.txt")];
  const batch = {
    batch: "b1",
    done: true,
    files: [
      { filename: "notes.txt", status: "completed" as const, document_count: 1, error: null },
    ],
  };
  const create = vi.spyOn(api, "createDocuments").mockResolvedValue(batch);
  vi.spyOn(api, "getDocumentsStatus").mockResolvedValue(batch);
  renderView();
  await userEvent.click(await screen.findByRole("button", { name: "Next" }));
  expect(screen.getByText("Choose at least one file.")).toBeInTheDocument();
  await userEvent.upload(screen.getByLabelText("Files"), files);
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText(/notes\.txt ·/)).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Previous" }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Upload" }));
  expect(await screen.findByText("Done: 1 document added.")).toBeInTheDocument();
  expect(create).toHaveBeenCalledWith("demo", files);
  await userEvent.click(screen.getByRole("button", { name: "Back to documents" }));
  expect(await screen.findByText("Document list")).toBeInTheDocument();
});

it("prevents uploading into an unmanaged corpus", async () => {
  vi.spyOn(api, "getDataset").mockResolvedValue({ ...dataset, managed: false });
  renderView();
  expect(await screen.findByText("Import this dataset before adding files.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Files")).not.toBeInTheDocument();
});
