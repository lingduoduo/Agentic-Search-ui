import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDatasetDocuments } from "../useDataset";
import * as api from "../../services/api";
import type { DatasetDocumentPage } from "../../models";

const page = (id: string): DatasetDocumentPage => ({
  list: [
    {
      id,
      document_id: id,
      title: id,
      contents: "",
      source: null,
      acl: [],
      enabled: true,
      updated_at: null,
    },
  ],
  paginator: { current_page: 1, page_size: 20, total_page: 1, total_record: 1 },
});

afterEach(() => vi.restoreAllMocks());

it("ignores an older search response even when the transport resolves after abort", async () => {
  let finishOld!: (value: DatasetDocumentPage) => void;
  vi.spyOn(api, "getDatasetDocuments")
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce(page("new"));
  const { result, rerender } = renderHook(
    ({ keyword }) => useDatasetDocuments("demo", 1, keyword),
    { initialProps: { keyword: "old" } },
  );
  rerender({ keyword: "new" });
  await waitFor(() => expect(result.current.documents[0]?.id).toBe("new"));
  await act(async () => finishOld(page("old")));
  expect(result.current.documents[0]?.id).toBe("new");
});
