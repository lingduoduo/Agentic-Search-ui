import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetrievalStatus } from "../RetrievalStatus";
import * as api from "../../services/api";

describe("RetrievalStatus", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the retrieval server's host and that it is up", async () => {
    vi.spyOn(api, "getRetrievalStatus").mockResolvedValue({
      url: "http://127.0.0.1:8001",
      embedded: false,
      ok: true,
    });
    render(<RetrievalStatus />);
    const pill = await screen.findByText("retrieval · 127.0.0.1:8001 · up");
    expect(pill).not.toHaveClass("route-pill--degraded");
  });

  it("marks a down server in amber", async () => {
    vi.spyOn(api, "getRetrievalStatus").mockResolvedValue({
      url: "http://127.0.0.1:8001",
      embedded: false,
      ok: false,
    });
    render(<RetrievalStatus />);
    const pill = await screen.findByText("retrieval · 127.0.0.1:8001 · down");
    expect(pill).toHaveClass("route-pill--degraded");
  });

  it("labels in-process retrieval as embedded", async () => {
    vi.spyOn(api, "getRetrievalStatus").mockResolvedValue({
      url: "http://127.0.0.1:7860",
      embedded: true,
      ok: true,
    });
    render(<RetrievalStatus />);
    const pill = await screen.findByText("retrieval · embedded · up");
    expect(pill).toHaveAttribute("title", "Served in-process at http://127.0.0.1:7860");
  });

  it("renders nothing when the status cannot be fetched", async () => {
    const status = vi.spyOn(api, "getRetrievalStatus").mockRejectedValue(new Error("404"));
    const { container } = render(<RetrievalStatus />);
    await vi.waitFor(() => expect(status).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
