import { DEFAULT_ROUTE, ROUTES } from "../config/routes";
import type { Route } from "../config/routes";

/** Keep supported index, new-workspace and single-session detail URLs. */
export function canonicalPathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  const segments = trimmed.split("/");
  const surface = `/${segments[1]}`;
  return (ROUTES as readonly string[]).includes(surface) &&
    (segments.length === 2 || (segments.length === 3 && segments[2]))
    ? trimmed
    : DEFAULT_ROUTE;
}

/** Resolve a nested URL to the surface used by the header and navigation. */
export function normalizeRoute(pathname: string): Route {
  return `/${canonicalPathname(pathname).split("/")[1]}` as Route;
}
