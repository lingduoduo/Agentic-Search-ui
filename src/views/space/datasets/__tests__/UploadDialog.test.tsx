import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../../../services/api";
import type { DocumentBatchView, UploadFileView } from "../../../../models";
import { BATCH_POLL_MS } from "../../../../hooks/useDataset";
import { MAX_BYTES, MAX_FILES, UploadDialog, checkFiles } from "../UploadDialog";

const file = (name: string, size = 3) => new File(["x".repeat(size)], name);

const entry = (filename: string, extra: Partial<UploadFileView> = {}): UploadFileView => ({
  filename,
  status: "waiting",
  error: null,
  document_count: 0,
  ...extra,
});

const batch = (files: UploadFileView[], done: boolean): DocumentBatchView => ({
  batch: "batch_1",
  files,
  done,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("checkFiles", () => {
  it("accepts .jsonl, .txt and .md files within the limits", () => {
    expect(checkFiles([file("a.jsonl"), file("B.TXT"), file("c.md")])).toBe("");
  });

  it.each([
    [[], "Choose at least one file."],
    [[file("a.pdf")], "a.pdf: use .jsonl, .txt or .md files."],
    [[file("noext")], "noext: use .jsonl, .txt or .md files."],
    [[file("big.txt", MAX_BYTES + 1)], "big.txt is over the 10 MB limit."],
    [
      Array.from({ length: MAX_FILES + 1 }, (_, i) => file(`${i}.txt`)),
      `Upload at most ${MAX_FILES} files at a time.`,
    ],
  ])("rejects %#", (files, message) => {
    expect(checkFiles(files as File[])).toBe(message);
  });
});

describe("UploadDialog", () => {
  it("does not upload a selection it would reject", async () => {
    const create = vi.spyOn(api, "createDocuments");
    render(<UploadDialog datasetName="kb" onClose={vi.fn()} onUploaded={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText("Files"), file("a.pdf"), { applyAccept: false });
    await userEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(screen.getByText("a.pdf: use .jsonl, .txt or .md files.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("uploads, polls each file until done, then reports and reloads once", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const files = [file("notes.txt"), file("bad.jsonl")];
    const create = vi
      .spyOn(api, "createDocuments")
      .mockResolvedValue(batch([entry("notes.txt"), entry("bad.jsonl")], false));
    const status = vi
      .spyOn(api, "getDocumentsStatus")
      .mockResolvedValueOnce(
        batch([entry("notes.txt", { status: "parsing" }), entry("bad.jsonl")], false),
      )
      .mockResolvedValueOnce(
        batch(
          [
            entry("notes.txt", { status: "completed", document_count: 3 }),
            entry("bad.jsonl", { status: "error", error: "Line 1: not valid JSON." }),
          ],
          true,
        ),
      );
    const onUploaded = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UploadDialog datasetName="kb" onClose={vi.fn()} onUploaded={onUploaded} />);

    await user.upload(screen.getByLabelText("Files"), files);
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(create).toHaveBeenCalledWith("kb", files);
    const progress = await screen.findByRole("list", { name: "Upload progress" });
    expect(await within(progress).findByText("Processing")).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(BATCH_POLL_MS));

    expect(await within(progress).findByText("Added · 3 documents")).toBeInTheDocument();
    expect(within(progress).getByText("Failed")).toBeInTheDocument();
    expect(within(progress).getByText("Line 1: not valid JSON.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Done: 3 documents added.");
    expect(status).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledWith("kb", "batch_1", expect.anything());
    expect(onUploaded).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(BATCH_POLL_MS * 3));
    expect(status).toHaveBeenCalledTimes(2); // no polling once done
  });

  it("shows an upload error from the server", async () => {
    vi.spyOn(api, "createDocuments").mockRejectedValue(
      new Error("Import this dataset before changing it."),
    );
    render(<UploadDialog datasetName="kb" onClose={vi.fn()} onUploaded={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText("Files"), file("a.txt"));
    await userEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("Import this dataset before changing it.")).toBeInTheDocument();
  });

  it("shows when checking the upload fails", async () => {
    vi.spyOn(api, "createDocuments").mockResolvedValue(batch([entry("a.txt")], false));
    vi.spyOn(api, "getDocumentsStatus").mockRejectedValue(new Error("Upload batch not found."));
    render(<UploadDialog datasetName="kb" onClose={vi.fn()} onUploaded={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText("Files"), file("a.txt"));
    await userEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("Upload batch not found.")).toBeInTheDocument();
  });
});
