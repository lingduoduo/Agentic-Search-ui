import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDatasets } from "../useDataset";
import * as api from "../../services/api";
import type { DatasetPage } from "../../models";

const page = (name: string): DatasetPage => ({
  list: [
    {
      name,
      path: null,
      docs: 0,
      domain: null,
      source: name,
      available: true,
      served: false,
      managed: false,
      description: null,
      updated_at: null,
    },
  ],
  paginator: { current_page: 1, page_size: 20, total_page: 1, total_record: 1 },
});

afterEach(() => vi.restoreAllMocks());
it("ignores a late response from an older keyword search", async () => {
  let finishOld!: (value: DatasetPage) => void;
  vi.spyOn(api, "getDatasets")
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce(page("new"));
  const { result, rerender } = renderHook(({ keyword }) => useDatasets(keyword), {
    initialProps: { keyword: "old" },
  });
  rerender({ keyword: "new" });
  await waitFor(() => expect(result.current.datasets[0]?.name).toBe("new"));
  await act(async () => finishOld(page("old")));
  expect(result.current.datasets[0]?.name).toBe("new");
});
