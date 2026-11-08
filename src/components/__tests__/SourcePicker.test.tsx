import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SourcePicker } from "../SourcePicker";

const options = [
  { name: "web", description: "General search" },
  { name: "news", description: "Current events" },
  { name: "code", description: "Software" },
];

describe("SourcePicker", () => {
  it("defaults to a closed All sources picker and filters options", async () => {
    render(<SourcePicker domains={["web"]} options={options} onChange={vi.fn()} />);
    expect(screen.queryByRole("checkbox", { name: "news" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /sources: all sources/i }));
    expect(screen.getByRole("checkbox", { name: "All sources" })).toBeChecked();
    await userEvent.type(screen.getByRole("searchbox"), "news");
    expect(screen.getByRole("checkbox", { name: "news" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "code" })).not.toBeInTheDocument();
  });

  it("selects a category and closes on Escape", async () => {
    const onChange = vi.fn();
    render(<SourcePicker domains={["web"]} options={options} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: /sources:/i });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("checkbox", { name: "news" }));
    expect(onChange).toHaveBeenCalledWith(["news"]);
    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
