import { generatePath, matchPath } from "react-router";
import type { Params } from "react-router";

/** Every page by name, which is also its route `id` (like Vue Router's named routes). */
export const ROUTE_PATHS = {
  "auth-login": "/auth/login",
  "space-apps-list": "/space/apps",
  "space-apps-detail": "/space/apps/:app_id",
  "pages-account": "/account",
  "pages-admin": "/admin",
} as const;

export type RouteName = keyof typeof ROUTE_PATHS;

/** The URL of a named route, e.g. `routePath("space-apps-detail", { app_id: "chat" })`. */
export function routePath(name: RouteName, params?: Record<string, string>): string {
  return generatePath(ROUTE_PATHS[name] as string, params);
}

/** The apps `/space/apps/:app_id` can open. */
export const APPS = [
  {
    id: "assist",
    title: "Assistant",
    description: "Ask a question, search your sources, and follow the answer trail.",
  },
  {
    id: "search",
    title: "Search",
    description: "Find relevant documents and explore the sources behind each result.",
  },
  { id: "chat", title: "Chat", description: "Start a conversation with your model." },
  {
    id: "tools",
    title: "Tools",
    description: "Ask the tool agent to complete a task and inspect its results.",
  },
] as const;

export type AppId = (typeof APPS)[number]["id"];

export const findApp = (id: string | undefined) => APPS.find((app) => app.id === id);

export const DEFAULT_ROUTE = ROUTE_PATHS["space-apps-list"];

/** The public sign-in page; POST to the same path is the backend's login. */
export const LOGIN_PATH = ROUTE_PATHS["auth-login"];

/** Whether a pathname is a signed-in page, so a safe place to return to after sign-in. */
export function isRoute(pathname: string): boolean {
  return (Object.keys(ROUTE_PATHS) as RouteName[]).some((name) => {
    if (name === "auth-login") return false;
    const match = matchPath(ROUTE_PATHS[name], pathname);
    return match !== null && (name !== "space-apps-detail" || !!findApp(match.params.app_id));
  });
}

export type PageHeading = { title: string; description: string };

/** A route's `handle`, read by the guard and by DefaultLayout. */
export type RouteHandle = {
  /** Reachable without signing in (Vue's `meta.public`). */
  public?: boolean;
  /** The heading DefaultLayout shows above the page. */
  heading?: PageHeading | ((params: Params) => PageHeading | undefined);
};
