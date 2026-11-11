import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const prefixes = [
  "api",
  "health",
  "ready",
  "auth",
  "me",
  "admin",
  "analytics",
  "chat",
  "search",
  "tools",
  "tool",
];
const sharedPages = ["/chat", "/search", "/tools"];
const isPage = (req) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  return (
    (req.method === "GET" || req.method === "HEAD") &&
    req.headers.accept?.includes("text/html") &&
    (sharedPages.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
      ["/admin", "/auth/login"].includes(pathname))
  );
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mockEnabled = env.MOCK_API === "true" || mode === "mock";
  // The client prepends it to backend paths, so it must be a bare origin.
  const apiBase = env.VITE_API_BASE_URL?.trim();
  if (apiBase && !/^https?:\/\/[^/?#]+\/?$/.test(apiBase)) {
    throw new Error(`VITE_API_BASE_URL must be an origin like http://127.0.0.1:7860: ${apiBase}`);
  }
  return {
    plugins: [
      react(),
      {
        name: "development-helpers",
        async configureServer(server) {
          if (mockEnabled) {
            const [{ default: routes }, { createMockMiddleware }] = await Promise.all([
              import("./mocks/config.js"),
              import("./mocks/middleware.js"),
            ]);
            const mock = createMockMiddleware(routes);
            server.middlewares.use((req, res, next) =>
              isPage(req) ? next() : mock(req, res, next),
            );
          }
          server.middlewares.use("/dev-login.html", (req, res, next) => {
            if (req.method !== "GET" && req.method !== "HEAD") return next();
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(readFileSync(new URL("./dev-login.html", import.meta.url)));
          });
        },
      },
    ],
    // Expose only these two public settings to browser code: the debug flag and
    // the optional backend origin for direct cross-origin calls. Never secrets.
    envPrefix: ["VITE_DEBUG_PANELS", "VITE_API_BASE_URL"],
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        [`^/(${prefixes.join("|")})(/|\\?|$)`]: {
          target: env.BACKEND_URL || "http://127.0.0.1:7860",
          bypass(req) {
            if (isPage(req)) return req.url;
          },
        },
      },
    },
    preview: { host: "127.0.0.1", port: 4173, proxy: {} },
    build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
  };
});
