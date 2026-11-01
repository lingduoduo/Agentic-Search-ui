import { DEFAULT_ROUTE, ROUTES } from "../config/routes";
import type { Route } from "../config/routes";

/**
 * Resolve any pathname onto one of the four pages. The navigation is a closed
 * set, so an unknown path is a typo rather than a 404 worth rendering.
 */
export function normalizeRoute(pathname: string): Route {
  const trimmed = pathname.replace(/\/+$/, "");
  return (ROUTES as readonly string[]).includes(trimmed) ? (trimmed as Route) : DEFAULT_ROUTE;
}
