import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Transcript } from "../Transcript";
import type { ConversationTurn } from "../../models";

describe("Transcript", () => {
  it("renders user and assistant turns in order", () => {
    const turns: ConversationTurn[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    render(<Transcript turns={turns} />);
    expect(screen.getByText("hi")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("labels each turn with a role-specific avatar and name", () => {
    const { container } = render(
      <Transcript
        turns={[
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
        ]}
      />,
    );
    const [user, assistant] = container.querySelectorAll(".turn");
    expect(user.querySelector(".turn__avatar--user svg")).not.toBeNull();
    expect(user.querySelector(".turn__name")).toHaveTextContent("You");
    expect(assistant.querySelector(".turn__avatar--assistant svg")).not.toBeNull();
    expect(assistant.querySelector(".turn__name")).toHaveTextContent("Assistant");
    // The name label speaks for the turn; the avatar is decoration.
    expect(user.querySelector(".turn__avatar")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a typing indicator while an assistant turn has no content yet", () => {
    render(<Transcript turns={[{ role: "assistant", content: "", pending: true }]} />);
    expect(screen.getByRole("img", { name: "Assistant is responding" })).toBeInTheDocument();
  });

  it("renders an assistant turn's tool calls", () => {
    const turns: ConversationTurn[] = [
      {
        role: "assistant",
        content: "done",
        toolCalls: [
          {
            tool_name: "search",
            status: "completed",
            arguments: {},
            result_summary: "3 items",
            latency_ms: 10,
            error: null,
          },
        ],
      },
    ];
    render(<Transcript turns={turns} />);
    expect(screen.getByText(/search/)).toBeInTheDocument();
  });

  it("renders nothing for an empty transcript", () => {
    const { container } = render(<Transcript turns={[]} />);
    expect(container.querySelector(".transcript")?.children.length ?? 0).toBe(0);
  });
});
