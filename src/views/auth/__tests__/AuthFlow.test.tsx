import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../../../routes/router";
import { accountCleared } from "../../../store/account";
import { store } from "../../../store";
import { renderWithStore } from "../../../__tests__/renderApp";
import { safeRedirectPath } from "../session";

const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose());
  vi.unstubAllGlobals();
  store.dispatch(accountCleared());
});

const alice = { id: "u1", email: "alice@example.test", role: "basic", is_active: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () => json({ detail: "Authentication required." }, 401);

/** Stub fetch with "METHOD /path" handlers; anything else is a 404. */
function stubBackend(handlers: Record<string, (init?: RequestInit) => Response>) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${new URL(input, "http://localhost").pathname}`;
    return handlers[key]?.(init) ?? json({ detail: "Not Found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function signedIn(permissions: string[]) {
  return {
    "GET /me": () => json(alice),
    "GET /me/permissions": () => json(permissions),
  };
}

function renderAt(url: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [url] });
  routers.push(router);
  renderWithStore(<RouterProvider router={router} />);
  return router;
}

const calledPaths = (fetchMock: ReturnType<typeof stubBackend>) =>
  fetchMock.mock.calls.map(([input]) => new URL(input, "http://localhost").pathname);

describe("safeRedirectPath", () => {
  it.each([
    ["/space/apps/chat?from=link#top", "/space/apps/chat?from=link#top"],
    ["/admin", "/admin"],
    ["/account", "/account"],
    [null, "/space/apps"],
    ["", "/space/apps"],
    ["/login", "/space/apps"],
    ["/auth/login", "/space/apps"],
    ["/unknown", "/space/apps"],
    ["//evil.example/chat", "/space/apps"],
    ["/\\evil.example/chat", "/space/apps"],
    ["https://evil.example/chat", "/space/apps"],
    ["javascript:alert(1)", "/space/apps"],
    ["chat", "/space/apps"],
  ])("maps %s to %s", (next, expected) => {
    expect(safeRedirectPath(next)).toBe(expected);
  });
});

describe("sign-in", () => {
  it("sends a signed-out user to login before mounting a workspace", async () => {
    stubBackend({ "GET /me": unauthorized, "GET /me/permissions": unauthorized });
    const router = renderAt("/space/apps/chat?from=link");
    expect(
      await screen.findByRole("heading", { name: "Sign in to Agentic Search" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/auth/login");
    expect(router.state.location.search).toBe("?redirect=/space/apps/chat%3Ffrom%3Dlink");
    expect(screen.queryByRole("textbox", { name: "Chat message" })).not.toBeInTheDocument();
  });

  it("treats a session for a user that no longer exists as signed out", async () => {
    stubBackend({
      "GET /me": () => json({ detail: "User not found." }, 404),
      "GET /me/permissions": () => json(["basic_access"]),
    });
    const router = renderAt("/space/apps/assist");
    expect(
      await screen.findByRole("heading", { name: "Sign in to Agentic Search" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/auth/login");
  });

  it("opens the site at sign-in, then lands on Home", async () => {
    let session = false;
    stubBackend({
      "GET /me": () => (session ? json(alice) : unauthorized()),
      "GET /me/permissions": () => (session ? json(["basic_access"]) : unauthorized()),
      "POST /auth/login": () => {
        session = true;
        return json(alice);
      },
    });
    const router = renderAt("/");
    await screen.findByRole("heading", { name: "Sign in to Agentic Search" });
    expect(router.state.location.pathname + router.state.location.search).toBe(
      "/auth/login?redirect=/space/apps",
    );
    await userEvent.type(screen.getByLabelText("Email"), alice.email);
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const apps = await screen.findByRole("region", { name: "Apps" });
    const sidebar = screen.getByRole("complementary", { name: "Common navigation" });
    expect(router.state.location.pathname).toBe("/space/apps");
    expect(within(apps).getByRole("link", { name: /chat/i })).toHaveAttribute(
      "href",
      "/space/apps/chat",
    );
    expect(within(sidebar).getByRole("link", { name: /chat/i })).toHaveAttribute(
      "href",
      "/space/apps/chat",
    );
    expect(within(sidebar).queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("posts the credentials as a form and returns to the requested page", async () => {
    let session = false;
    const fetchMock = stubBackend({
      "GET /me": () => (session ? json(alice) : unauthorized()),
      "GET /me/permissions": () => (session ? json(["basic_access"]) : unauthorized()),
      "POST /auth/login": () => {
        session = true;
        return json(alice);
      },
    });
    const router = renderAt("/auth/login?redirect=%2Fspace%2Fapps%2Fchat%3Ffrom%3Dlink");
    await userEvent.type(await screen.findByLabelText("Email"), `  ${alice.email} `);
    await userEvent.type(screen.getByLabelText("Password"), "test-only-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("textbox", { name: "Chat message" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/space/apps/chat");
    expect(router.state.location.search).toBe("?from=link");
    // Back from the page must not return to the sign-in form.
    expect(router.state.historyAction).toBe("REPLACE");
    const login = fetchMock.mock.calls.find(([input]) => input === "/auth/login")!;
    const body = login[1]!.body as URLSearchParams;
    expect(body.get("username")).toBe(alice.email);
    expect(body.get("password")).toBe("test-only-password");
    // The sign-in page's check, then the account load after login; the guard reuses it.
    expect(calledPaths(fetchMock).filter((path) => path === "/me")).toHaveLength(2);
  });

  it("stays on sign-in when the account cannot be loaded after login", async () => {
    stubBackend({
      "GET /me": unauthorized,
      "GET /me/permissions": unauthorized,
      "POST /auth/login": () => json(alice),
    });
    const router = renderAt("/auth/login?redirect=/space/apps/chat");
    await userEvent.type(await screen.findByLabelText("Email"), alice.email);
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Authentication required.");
    expect(router.state.location.pathname).toBe("/auth/login");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("explains how to get a dev account in development builds", async () => {
    stubBackend({ "GET /me": unauthorized, "GET /me/permissions": unauthorized });
    renderAt("/auth/login");
    expect(await screen.findByRole("link", { name: "/dev-login.html" })).toHaveAttribute(
      "href",
      "/dev-login.html",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("maxlength", "254");
  });

  it("ignores an off-site redirect", async () => {
    let session = false;
    stubBackend({
      "GET /me": () => (session ? json(alice) : unauthorized()),
      "GET /me/permissions": () => (session ? json(["basic_access"]) : unauthorized()),
      "POST /auth/login": () => {
        session = true;
        return json(alice);
      },
    });
    const router = renderAt("/auth/login?redirect=%2F%2Fevil.example%2Fchat");
    await userEvent.type(await screen.findByLabelText("Email"), alice.email);
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/space/apps"));
  });

  it("shows the backend's reason when sign-in fails", async () => {
    stubBackend({
      "GET /me": unauthorized,
      "GET /me/permissions": unauthorized,
      "POST /auth/login": () => json({ detail: "Invalid credentials." }, 400),
    });
    renderAt("/auth/login");
    await userEvent.type(await screen.findByLabelText("Email"), alice.email);
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
  });

  it("skips the form for a user who is already signed in", async () => {
    stubBackend(signedIn(["basic_access"]));
    const router = renderAt("/auth/login?redirect=%2Fspace%2Fapps%2Fsearch");
    expect(await screen.findByRole("textbox", { name: /search query/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/space/apps/search");
  });
});

describe("session guard", () => {
  it("confirms the session once, not on every navigation", async () => {
    const fetchMock = stubBackend(signedIn(["basic_access"]));
    const router = renderAt("/space/apps/assist");
    await screen.findByRole("complementary", { name: "Common navigation" });
    await router.navigate("/space/apps/chat");
    await router.navigate("/account");
    await screen.findByLabelText("Account details");
    expect(calledPaths(fetchMock).filter((path) => path === "/me")).toHaveLength(1);
  });

  it("opens the page with an error when the backend cannot confirm the session", async () => {
    stubBackend({
      "GET /me": () => json({ detail: "Bad gateway" }, 502),
      "GET /me/permissions": () => json({ detail: "Bad gateway" }, 502),
    });
    const router = renderAt("/space/apps/chat");
    expect(await screen.findByRole("textbox", { name: "Chat message" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not confirm your session");
    expect(router.state.location.pathname).toBe("/space/apps/chat");
  });

  it("returns to login when any request reports the session has ended", async () => {
    let session = true;
    stubBackend({
      "GET /me": () => (session ? json(alice) : unauthorized()),
      "GET /me/permissions": () => (session ? json(["basic_access"]) : unauthorized()),
      // The tools page lists the tool inventory on mount.
      "GET /admin/tools": () => {
        session = false;
        return unauthorized();
      },
    });
    const router = renderAt("/space/apps/assist");
    await screen.findByRole("complementary", { name: "Common navigation" });
    await router.navigate("/space/apps/tools?tab=run");
    expect(
      await screen.findByRole("heading", { name: "Sign in to Agentic Search" }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("?redirect=/space/apps/tools%3Ftab%3Drun");
  });
});

describe("permissions", () => {
  it("hides admin controls from a basic user and never fetches admin data", async () => {
    const fetchMock = stubBackend(signedIn(["basic_access"]));
    renderAt("/space/apps/assist");
    const sidebar = await screen.findByRole("complementary", { name: "Common navigation" });
    expect(within(sidebar).getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(within(sidebar).queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("button", { name: /manage tools/i }),
    ).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole("button", { name: /history/i })).not.toBeInTheDocument();
    expect(calledPaths(fetchMock).filter((path) => path.startsWith("/analytics"))).toEqual([]);
    expect(calledPaths(fetchMock)).not.toContain("/admin/observability/summary");
  });

  it("redirects a basic user away from the admin page before it loads", async () => {
    const fetchMock = stubBackend(signedIn(["basic_access"]));
    const router = renderAt("/admin");
    expect(await screen.findByRole("region", { name: "Apps" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/space/apps");
    expect(calledPaths(fetchMock)).not.toContain("/admin/observability/summary");
  });

  it("gives an admin the admin page with its overview", async () => {
    stubBackend({
      ...signedIn(["basic_access", "full_admin_panel_access"]),
      "GET /admin/observability/summary": () =>
        json({ health_label: "Healthy", health_score: 97, metrics: [], sections: [] }),
    });
    renderAt("/admin");
    expect(await screen.findByLabelText("Admin and observability")).toHaveTextContent("97%");
    const sidebar = screen.getByRole("complementary", { name: "Common navigation" });
    expect(within(sidebar).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(within(sidebar).getByRole("button", { name: /manage tools/i })).toBeInTheDocument();
  });
});

describe("account", () => {
  it("shows the signed-in identity and its access", async () => {
    stubBackend(signedIn(["basic_access"]));
    renderAt("/account");
    const account = await screen.findByLabelText("Account details");
    expect(account).toHaveTextContent(alice.email);
    expect(account).toHaveTextContent("basic");
    expect(account).toHaveTextContent("Workspaces");
    expect(account).not.toHaveTextContent("Admin panel");
  });

  it("shows the name, updates it in the store, and resets it", async () => {
    stubBackend(signedIn(["basic_access"]));
    renderAt("/account");
    const account = await screen.findByLabelText("Account details");
    expect(account).toHaveTextContent("Namealice");

    await userEvent.type(within(account).getByRole("textbox", { name: "New name" }), "Alice");
    await userEvent.click(within(account).getByRole("button", { name: "Update name" }));
    expect(account).toHaveTextContent("NameAlice");

    await userEvent.click(within(account).getByRole("button", { name: "Reset" }));
    expect(account).toHaveTextContent("Namealice");
  });

  it("signs out through the backend and returns to login", async () => {
    let session = true;
    const fetchMock = stubBackend({
      "GET /me": () => (session ? json(alice) : unauthorized()),
      "GET /me/permissions": () => (session ? json(["basic_access"]) : unauthorized()),
      "POST /auth/logout": () => {
        session = false;
        return new Response(null, { status: 204 });
      },
    });
    const router = renderAt("/space/apps/assist");
    const sidebar = await screen.findByRole("complementary", { name: "Common navigation" });
    await userEvent.click(within(sidebar).getByRole("button", { name: "Sign out" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in to Agentic Search" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/auth/login");
    expect(calledPaths(fetchMock)).toContain("/auth/logout");
  });

  it("shows the app's error screen when the backend cannot sign out", async () => {
    stubBackend({
      ...signedIn(["basic_access"]),
      // What the dev proxy answers when the backend is down.
      "POST /auth/logout": () => json({ detail: "Gateway Timeout" }, 504),
    });
    renderAt("/space/apps/assist");
    const sidebar = await screen.findByRole("complementary", { name: "Common navigation" });
    await userEvent.click(within(sidebar).getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument();
  });
});
