import { setTimeout } from "node:timers/promises";

/** Exact method/path matching; query parameters do not affect the match. */
export function createMockMiddleware(routes) {
  return async (req, res, next) => {
    try {
      const pathname = new URL(req.url, "http://localhost").pathname;
      const route = routes.find((item) => item.method === req.method && item.path === pathname);
      if (!route) return next();
      res.statusCode = route.status ?? 200;
      res.setHeader("X-Mock-API", "true");
      res.setHeader("Cache-Control", "no-store");
      for (const [name, value] of Object.entries(route.headers ?? {})) res.setHeader(name, value);
      if (route.events) {
        res.setHeader("Content-Type", "text/event-stream");
        res.flushHeaders();
        for (const event of route.events) {
          if (route.delayMs) await setTimeout(route.delayMs);
          if (res.destroyed) return;
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        return res.end();
      }
      if (route.delayMs) await setTimeout(route.delayMs);
      if (res.destroyed) return;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const response =
        typeof route.response === "function" ? await route.response(req) : route.response;
      res.end(JSON.stringify(response ?? null));
    } catch (error) {
      next(error);
    }
  };
}
