export const ROUTES = ["/assist", "/search", "/chat", "/tools"] as const;

export type Route = (typeof ROUTES)[number];

export const DEFAULT_ROUTE: Route = "/assist";
