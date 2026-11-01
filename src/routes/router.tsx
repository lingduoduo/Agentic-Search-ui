import { createBrowserRouter, redirect } from "react-router";
import type { RouteObject } from "react-router";
import { App } from "../apps/App";
import { LOGIN_PATH } from "../config/routes";
import { adminLoader, loginAction, loginLoader, logoutAction, requireLogin } from "../auth/session";
import { AccountPage } from "../pages/AccountPage";
import { AdminPage } from "../pages/AdminPage";
import { HomePage } from "../pages/HomePage";
import { AssistPage } from "../pages/AssistPage";
import { LoginPage } from "../pages/LoginPage";
import { SearchView } from "../pages/SearchView";
import { ChatView } from "../pages/ChatView";
import { ToolAgentView } from "../pages/ToolAgentView";

// Loaders resolve /me before the first render; there is nothing to show until then.
const HydrateFallback = () => null;

function RouteError() {
  return (
    <main className="login-page">
      <p className="error-banner" role="alert">
        Something went wrong. Reload the page to try again.
      </p>
    </main>
  );
}

export const appRoutes: RouteObject[] = [
  {
    path: LOGIN_PATH,
    loader: loginLoader,
    action: loginAction,
    Component: LoginPage,
    HydrateFallback,
    ErrorBoundary: RouteError,
  },
  // A GET only lands here by typing the URL; signing out is the POST action.
  { path: "/logout", loader: () => redirect("/account"), action: logoutAction },
  {
    id: "root",
    path: "/",
    // The guard: no page mounts, or fetches, until the session is confirmed.
    loader: requireLogin,
    // The shared layout owns the left sidebar; child pages render in its Outlet.
    Component: App,
    HydrateFallback,
    ErrorBoundary: RouteError,
    children: [
      { path: "home", Component: HomePage },
      { path: "assist", Component: AssistPage },
      { path: "search", Component: SearchView },
      { path: "chat", Component: ChatView },
      { path: "tools", Component: ToolAgentView },
      { path: "account", Component: AccountPage },
      { path: "admin", loader: adminLoader, Component: AdminPage },
      // The shared layout canonicalizes root and unknown URLs to /home.
      { path: "*", Component: HomePage },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
