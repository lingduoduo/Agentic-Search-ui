import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SourcePicker } from "../SourcePicker";

const options = [
  { name: "web", description: "General search" },
  { name: "news", description: "Current events" },
  { name: "code", description: "Software" },
  { name: "academic", description: "Papers" },
  { name: "brand_new", description: "Not in the frontend's table yet" },
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

  it("groups sources by family, with unknown ones under Other", async () => {
    render(<SourcePicker domains={["web"]} options={options} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /sources:/i }));
    const research = screen.getByRole("region", { name: "Research" });
    expect(within(research).getByRole("checkbox", { name: "academic" })).toBeInTheDocument();
    const other = screen.getByRole("region", { name: "Other" });
    expect(within(other).getByRole("checkbox", { name: "brand new" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Places & events" })).not.toBeInTheDocument();
  });

  it("narrows the list to one family from its tab", async () => {
    render(<SourcePicker domains={["web"]} options={options} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /sources:/i }));
    const tabs = screen.getByRole("group", { name: "Source families" });
    await userEvent.click(within(tabs).getByRole("button", { name: "Code & docs" }));
    expect(screen.getByRole("checkbox", { name: "code" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "news" })).not.toBeInTheDocument();
    await userEvent.click(within(tabs).getByRole("button", { name: "All" }));
    expect(screen.getByRole("checkbox", { name: "news" })).toBeInTheDocument();
  });

  it("shows the chosen sources as removable chips", async () => {
    const onChange = vi.fn();
    render(<SourcePicker domains={["news", "code"]} options={options} onChange={onChange} />);
    const chips = screen.getByLabelText("Selected sources");
    expect(chips).toHaveTextContent("news");
    await userEvent.click(within(chips).getByRole("button", { name: "Remove code" }));
    expect(onChange).toHaveBeenCalledWith(["news"]);
  });
});
