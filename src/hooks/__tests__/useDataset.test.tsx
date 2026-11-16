import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDataset } from "../useDataset";
import * as api from "../../services/api";
import type { DatasetView } from "../../models";

const dataset = (name: string): DatasetView => ({
  name,
  path: null,
  docs: 0,
  domain: null,
  source: name,
  available: true,
  served: false,
  managed: true,
  description: null,
  updated_at: null,
});
afterEach(() => vi.restoreAllMocks());

it("hides the previous dataset while the new route's dataset is loading", async () => {
  vi.spyOn(api, "getDataset")
    .mockResolvedValueOnce(dataset("first"))
    .mockImplementationOnce(() => new Promise(() => {}));
  const { result, rerender } = renderHook(({ name }) => useDataset(name), {
    initialProps: { name: "first" },
  });
  await waitFor(() => expect(result.current.dataset?.name).toBe("first"));
  rerender({ name: "second" });
  expect(result.current.dataset).toBeNull();
});

it("ignores a late response for the previously visited dataset", async () => {
  let finishOld!: (value: DatasetView) => void;
  vi.spyOn(api, "getDataset")
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce(dataset("second"));
  const { result, rerender } = renderHook(({ name }) => useDataset(name), {
    initialProps: { name: "first" },
  });
  rerender({ name: "second" });
  await waitFor(() => expect(result.current.dataset?.name).toBe("second"));
  await act(async () => finishOld(dataset("first")));
  expect(result.current.dataset?.name).toBe("second");
});
