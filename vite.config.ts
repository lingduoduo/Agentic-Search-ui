import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend lives in its own repository (Agentic-Search-GRPO). Override when it
// is not on the default port, e.g. BACKEND_URL=http://127.0.0.1:7861 npm run dev.
const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:7860";

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules\/(react|react-dom)\// },
            { name: "icons", test: /node_modules\/lucide-react\// },
          ],
        },
      },
    },
  },
  server: {
    // Proxy every backend prefix the app calls (api.ts). The admin panels use
    // unprefixed routers (/admin, /analytics, /chat); without these the panels
    // silently fail in dev because requests hit the Vite server, not FastAPI.
    proxy: {
      "/api": backend,
      "/health": backend,
      "/auth": backend,
      "/me": backend,
      "/admin": backend,
      "/analytics": backend,
      "/chat": {
        target: backend,
        // A page navigation asks for HTML; that is the SPA route, not the API.
        // API calls from the app send Accept: application/json and still proxy.
        bypass: (req) => (req.headers.accept?.includes("text/html") ? "/index.html" : undefined),
      },
      "/search": {
        target: backend,
        bypass: (req) => (req.headers.accept?.includes("text/html") ? "/index.html" : undefined),
      },
      // Proxy keys match by prefix, so "/tool" below would otherwise swallow the
      // /tools page too. Listed first because the first matching key wins.
      "/tools": {
        target: backend,
        bypass: (req) => (req.headers.accept?.includes("text/html") ? "/index.html" : undefined),
      },
      "/tool": backend,
    },
  },
});
