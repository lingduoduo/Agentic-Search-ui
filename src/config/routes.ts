export const ROUTES = [
  "/home",
  "/assist",
  "/search",
  "/chat",
  "/tools",
  "/account",
  "/admin",
] as const;

export type Route = (typeof ROUTES)[number];

export const DEFAULT_ROUTE: Route = "/home";

/** The public sign-in page; POST to the same path is the backend's login. */
export const LOGIN_PATH = "/auth/login";
