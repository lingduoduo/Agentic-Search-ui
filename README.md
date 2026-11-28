# Agentic Search UI

The React 19.1 + Vite + TypeScript + SCSS frontend for
[Agentic Search](https://github.com/lingduoduo/Agentic-Search-GRPO). A
single-page app that talks to the FastAPI backend over same-origin HTTP and SSE.

Signing in opens **Assistant** (`/space/apps/assist`). The apps list
(`/space/apps`) also opens **Search**, **Chat** and **Tools**, above an
**Artworks** gallery. Everyone gets the search-source catalog (`/space/sources`);
admins also get the tool registry (`/space/tools`), the retrieval datasets
(`/space/datasets`) and the admin dashboard (`/admin`).

## Quick start

Use Node.js 26 (as CI and Docker do) and the Yarn pinned in `package.json`.
React and React DOM stay on the 19.1 patch series.

```bash
npm install -g corepack && corepack enable  # once per Node install
yarn install
yarn start:mock      # no backend needed: sample API responses
yarn dev             # http://127.0.0.1:5173, proxies the backend at :7860
```

For `yarn dev`, start the backend first (the retrieval server plus the web app on
port 7860; see the backend README, or run its `bin/run_web_stack.sh`). Then
create a user at `http://127.0.0.1:5173/dev-login.html`, which the dev server
alone serves. The first user is an admin.

## Configuration

| Variable            | Default                                | Purpose                                                        |
| ------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `BACKEND_URL`       | `http://127.0.0.1:7860` in development | Proxy target; nginx defaults to `http://web:7860`.             |
| `VITE_DEBUG_PANELS` | Unset                                  | `1` shows the Assistant's debug panels.                        |
| `VITE_API_BASE_URL` | Unset (same-origin)                    | Backend origin for [direct calls](#direct-backend-calls).      |
| `MOCK_API`          | Unset                                  | `true` turns on the mock API with any mode (`yarn start:app`). |

```bash
VITE_DEBUG_PANELS=1 BACKEND_URL=http://127.0.0.1:7861 yarn dev
```

Values can also live in `.env` files, read with this priority: shell,
`.env.<mode>.local`, `.env.<mode>`, `.env.local`, `.env`. A named mode such as
`yarn start:app --mode keepghost` reads `.env.keepghost[.local]` and still runs
the dev server. Only `VITE_DEBUG_PANELS` and `VITE_API_BASE_URL` reach browser
code, and they are fixed at build time: restart or rebuild after changing them.

### Direct backend calls

By default the browser calls relative paths (`/api/...`) and the dev server or
nginx proxies them, so no CORS applies. To call the backend directly instead:

```bash
# Backend (Agentic-Search-GRPO): allow this page's exact origin
AGENTIC_SEARCH_CORS_ORIGINS=http://127.0.0.1:5173 uvicorn src.internal.servers.web.app:app --port 7860
# Frontend
VITE_API_BASE_URL=http://127.0.0.1:7860 yarn dev
```

The value must be a bare origin, with no path. The session cookie is
`SameSite=Lax`, so use the same host on both sides (`127.0.0.1` on both, not
`localhost` on one). Direct calls skip the mock API and the dev proxy.

## Mock API

`yarn start:mock` serves fixtures from [mocks/config.js](mocks/config.js)
(matched by [mocks/middleware.js](mocks/middleware.js)) and starts signed in as
an admin. Unlisted routes still reach `BACKEND_URL`. Mocks exist only in the dev
server, never in builds or `yarn preview`. Restart after editing the fixtures.

```js
export default [
  { method: "GET", path: "/api/example", delayMs: 150, response: { message: "Hello" } },
  {
    method: "POST",
    path: "/chat/send-chat-message",
    events: [
      { type: "answer", text: "Mock streaming answer" },
      { type: "done", session_id: "mock-session" },
    ],
  },
];
```

| Field            | Behavior                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| `method`, `path` | Required. Exact method and pathname; query parameters are ignored.        |
| `status`         | HTTP status, default `200` (for example `503` to simulate a failure).     |
| `response`       | A JSON value, or a function of the Node request that returns one.         |
| `events`         | SSE events sent in order as `data: <JSON>` frames, instead of `response`. |
| `delayMs`        | Delay before the JSON reply, or before each SSE event.                    |
| `headers`        | Extra response headers. Every mock reply also carries `X-Mock-API: true`. |

## Project layout

```text
src/
├── main.tsx          # Entry: loads the styles, mounts App
├── App.tsx           # Creates the router, renders RouterProvider
├── assets/
│   ├── images/       # Images, including the artworks (`Title-Artist.webp`)
│   └── styles/       # styles.scss (theme variables at the top) and tailwind.css
├── components/       # Reusable UI, admin panels and debug inspectors
├── config/           # Route names and paths, search constants, the artworks list
├── hooks/            # Shared hooks: datasets, search domains, keyword search, pagination
├── models/           # API and UI types
├── routes/           # The route tree (router.tsx)
├── services/         # Backend requests by domain; api.ts re-exports them
├── store/            # Redux Toolkit: the signed-in account
├── utils/            # request.ts (fetch/SSE wrapper) and pure helpers
└── views/            # One *View per route: auth, errors, layouts, pages, space/*
```

- **Where code goes.** Backend requests in the matching `services/` module,
  built on `get` / `post` / `stream` from `utils/request.ts`; shared types in
  `models/`; constants in `config/`; reusable UI in `components/`. Tests sit
  beside the code in `__tests__/`. Page state stays in its page; only the
  signed-in account is shared.
- **Routing.** Route ids are names (`routePath("space-apps-detail", { app_id })`),
  one guard loader checks the session, and pages load lazily. See
  [docs/frontend.md](docs/frontend.md#pages).
- **Theme.** Dark navy. Colours are the variables at the top of `styles.scss`:
  `--accent` for links and borders, the deeper `--accent-fill` behind white
  button text.
- **Assets.** Vite bundles only the files that code references. The exception is
  the gallery: every `.webp` in `src/assets/images/` appears on `/space/apps`,
  with the title and artist taken from `Title-Artist.webp` (split on the first
  hyphen). Spell each artist the same way in every file, and keep images at most
  1200px wide:

  ```bash
  cwebp -q 80 -resize 1200 0 painting.png -o "src/assets/images/Primavera-Sandro Botticelli.webp"
  ```

## Checks

```bash
yarn test:ci           # everything CI runs: lint, format check, typecheck, build, tests
yarn lint              # ESLint (yarn lint:fix to fix)
yarn format            # Prettier (yarn format:check to only check)
yarn typecheck         # TypeScript
yarn test:unit         # Vitest (yarn test:unit:watch to watch)
yarn test:build-config # Vite proxy and production config
yarn build             # production bundle → dist/
yarn preview           # serve dist/ at :4173 (no backend proxy)
```

Type checking uses TypeScript 7 (the `@typescript/native` alias). The
`typescript` alias stays on 6 for the ESLint parser, following Microsoft's
[side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0).

## Deploy

The `Dockerfile` builds the bundle and serves it from nginx (non-root, port
8080). nginx proxies the backend's routes to `BACKEND_URL`, so cookies and
streaming work on one origin. For a backend on another origin, build with
`VITE_API_BASE_URL` instead (see [direct calls](#direct-backend-calls)).

```bash
docker build -t agentic-search-ui:local .
docker run -p 8080:8080 -e BACKEND_URL=http://host.docker.internal:7860 agentic-search-ui:local
```

On macOS with Colima, run `colima start && docker context use colima` first.
nginx resolves `BACKEND_URL` at startup, so the container exits if the host does
not resolve yet. The backend's compose file can build this repo as a sibling
checkout:

```bash
# in the backend repo
docker compose -f docker/docker-compose.yml --profile frontend up --build  # → http://localhost:8080
```

## Adding a page

1. Create the view in `src/views/` with tests in a `__tests__/` folder beside it.
2. Name it in `ROUTE_PATHS` (`src/config/routes.ts`) and register it in
   `src/routes/router.tsx` with that name as its `id`, under `DefaultLayout` (with
   a `handle.heading`) or, for a public page, `BlankLayout` with
   `handle: { public: true }`. Add a sidebar link in
   `src/components/AppSidebar.tsx`. A new app only needs entries in `APPS` and
   `DetailView`.
3. Keep serving aligned: add the path to the `bypass` list in `vite.config.js`,
   the shared-prefix location in `nginx/default.conf.template`, and `spa_page` in
   the backend's `src/internal/servers/web/app.py`. A new backend prefix goes in
   both the Vite proxy and nginx's backend-only location.

[docs/frontend.md](docs/frontend.md) covers the UI in detail: pages and routing,
signing in, the admin dashboard, the dev console and every feature.
