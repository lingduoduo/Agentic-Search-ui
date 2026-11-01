import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter, matchRoutes } from "react-router";
import { NavLink } from "../../components/NavLink";
import { BlankLayout } from "../../views/layouts/BlankLayout";
import { DefaultLayout } from "../../views/layouts/DefaultLayout";
import { isRoute, routePath } from "../../config/routes";
import type { RouteHandle } from "../../config/routes";
import { appRoutes } from "../router";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("NavLink", () => {
  it("renders a real href so copy-link and new-tab work", () => {
    render(<NavLink to="/chat">Chat</NavLink>, { wrapper });
    expect(screen.getByRole("link", { name: "Chat" })).toHaveAttribute("href", "/chat");
  });

  it("marks the active route with aria-current", () => {
    window.history.replaceState({}, "", "/chat");
    render(
      <>
        <NavLink to="/chat">Chat</NavLink>
        <NavLink to="/tools">Tools</NavLink>
      </>,
      { wrapper },
    );
    expect(screen.getByRole("link", { name: "Chat" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tools" })).not.toHaveAttribute("aria-current");
  });

  it("navigates on a plain left click", async () => {
    render(<NavLink to="/tools">Tools</NavLink>, { wrapper });
    await userEvent.click(screen.getByRole("link", { name: "Tools" }));
    expect(window.location.pathname).toBe("/tools");
  });

  // A modified click means "new tab" — the browser owns it, we must not hijack it.
  // The direct userEvent API drops held modifiers between calls, so this case
  // needs a session from userEvent.setup() to keep Meta down across the click.
  it("leaves a cmd-click to the browser", async () => {
    const user = userEvent.setup();
    render(<NavLink to="/tools">Tools</NavLink>, { wrapper });
    await user.keyboard("{Meta>}");
    await user.click(screen.getByRole("link", { name: "Tools" }));
    await user.keyboard("{/Meta}");
    expect(window.location.pathname).toBe("/");
  });
});

describe("routes", () => {
  const matchAt = (path: string) => (matchRoutes(appRoutes, path) ?? []).map((m) => m.route);

  it.each([
    ["/space/apps", "space-apps-list"],
    ["/space/apps/chat", "space-apps-detail"],
    ["/account", "pages-account"],
    ["/admin", "pages-admin"],
    ["/auth/login", "auth-login"],
    ["/anything/else", "not-found"],
  ])("names the route at %s %s", (path, name) => {
    expect(matchAt(path).at(-1)?.id).toBe(name);
  });

  it.each(["/space/apps", "/space/apps/chat", "/account", "/admin"])(
    "puts %s in DefaultLayout, behind the guard",
    (path) => {
      const routes = matchAt(path);
      expect(routes.map((r) => r.Component)).toContain(DefaultLayout);
      expect((routes.at(-1)?.handle as RouteHandle | undefined)?.public).toBeFalsy();
    },
  );

  it.each(["/auth/login", "/unknown"])("puts %s in BlankLayout, marked public", (path) => {
    const routes = matchAt(path);
    expect(routes.map((r) => r.Component)).toContain(BlankLayout);
    expect((routes.at(-1)?.handle as RouteHandle).public).toBe(true);
  });
});

describe("named routes", () => {
  it("builds URLs from names", () => {
    expect(routePath("space-apps-list")).toBe("/space/apps");
    expect(routePath("space-apps-detail", { app_id: "chat" })).toBe("/space/apps/chat");
  });

  it.each([
    ["/space/apps", true],
    ["/space/apps/tools", true],
    ["/space/apps/nope", false],
    ["/account", true],
    ["/auth/login", false],
    ["/chat", false],
  ])("treats %s as a page to return to: %s", (path, expected) => {
    expect(isRoute(path)).toBe(expected);
  });
});
