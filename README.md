# Agentic Search UI

The React 19.1 + Vite + TypeScript + SCSS frontend for
[Agentic Search](https://github.com/lingduoduo/Agentic-Search-GRPO). It's a
single-page app that opens **Assistant** directly at `/space/apps/assist`.
The optional apps list (`/space/apps`) opens four apps at
`/space/apps/:app_id`: **Assistant** (`assist`), **Search** (`search`), **Chat**
(`chat`), and **Tools** (`tools`). It talks to the
FastAPI backend over same-origin HTTP and SSE.

## Develop

Use Node.js 26 (the version used by CI and Docker) and Yarn 1.22.22
(pinned in `package.json`). For live API calls, start the retrieval server and
web backend on port 7860 (see the backend README). For the sample mocked flows,
you can start without a backend using `yarn start:mock`. Install and run:

```bash
npm install -g corepack && corepack enable  # once per Node install: provides the pinned Yarn
yarn install
yarn dev             # http://127.0.0.1:5173, proxies backend routes to :7860
```

If the backend runs somewhere else, point the dev proxy at it:

```bash
BACKEND_URL=http://127.0.0.1:7861 yarn dev
```

To start with a named environment:

```bash
yarn start:app --mode keepghost
```

Set `BACKEND_URL` in `.env.keepghost.local` or `.env.keepghost` for that
backend. Named environments still run in development mode on port 5173. Use
`MOCK_API=true yarn start:app --mode keepghost` to enable mocks with that
profile. Without a backend override, the proxy uses `http://127.0.0.1:7860`.

For a dev login, open `http://127.0.0.1:5173/dev-login.html` (dev server only).

For a production build and local static preview:

```bash
yarn build           # TypeScript check, then Vite output → dist/
yarn preview         # http://127.0.0.1:4173, serves the existing dist/
```

The preview has SPA route fallback but no backend proxy. Use `yarn dev` or the
nginx container to exercise authenticated requests and streaming against the
backend. `dev-login.html` is available only through `yarn dev` and is excluded
from the production bundle.

`index.html` is Vite's entry point and imports `src/main.tsx`. Shared styles
live in `src/assets/styles/styles.scss`; Vite handles SCSS (with Dart Sass),
CSS, and PostCSS. Development uses React Fast Refresh and source maps.
Production cleans `dist/` and generates hashed JavaScript and CSS assets
without source maps. React and React DOM stay on the 19.1 patch series. Build
and server settings live in `vite.config.js`; unit tests use
`vitest.config.ts`.

| Variable            | Default                                | Purpose                                                        |
| ------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `BACKEND_URL`       | `http://127.0.0.1:7860` in development | Backend proxy target; nginx uses `http://web:7860` by default. |
| `VITE_DEBUG_PANELS` | Disabled                               | Set to `1` to show the Assistant's debug panels.               |
| `VITE_API_BASE_URL` | Unset (same-origin)                    | Backend origin for direct cross-origin calls; see below.       |

For example:

```bash
VITE_DEBUG_PANELS=1 BACKEND_URL=http://127.0.0.1:7861 yarn dev
```

Vite reads environment values in this order, with the first value taking
priority: shell variables, `.env.<mode>.local`, `.env.<mode>`, `.env.local`,
then `.env`. The mode is `development` for `yarn dev` and `production` for
`yarn build`. A named environment replaces `<mode>` in those file names
without changing whether the command serves development or builds production.
The debug flag is embedded during compilation, so restart the dev server or
rebuild after changing it. Only variables starting with `VITE_DEBUG_PANELS`
or `VITE_API_BASE_URL` reach browser code (`envPrefix` in `vite.config.js`);
`BACKEND_URL` and the rest stay on the dev server.

### Proxied or direct backend calls

By default the browser calls relative paths (`/api/...`, `/auth/login`) and the
dev server or nginx proxies them to the backend, so no CORS applies. Setting
`VITE_API_BASE_URL` to the backend's origin makes the browser call it directly,
with the session cookie included:

```bash
# Backend, in Agentic-Search-GRPO: allow this page's exact origin.
AGENTIC_SEARCH_CORS_ORIGINS=http://127.0.0.1:5173 uvicorn src.internal.servers.web.app:app --port 7860
# Frontend:
VITE_API_BASE_URL=http://127.0.0.1:7860 yarn dev
```

The value must be a bare origin (no path); `vite.config.js` rejects anything
else. It is public and embedded at build time. The backend's session cookie is
`SameSite=Lax`, so use the same host on both sides (`127.0.0.1`, not
`localhost` on one and `127.0.0.1` on the other). Direct calls bypass the mock
API and the dev proxy; `dev-login.html` still goes through the proxy.

## Mock API

Start the Vite dev server at `http://127.0.0.1:5173` with sample API
responses. Open `/space/apps` and pick an app to try the fixtures:

```bash
yarn start:mock
# or combine mocks with a named backend environment:
MOCK_API=true yarn start:app --mode keepghost
```

The sample [mocks/config.js](mocks/config.js) contains the response fixtures;
[mocks/middleware.js](mocks/middleware.js) handles matching and delivery.
Edit the config to add fixtures, then restart the dev server. Each entry
matches an exact HTTP method and pathname; query parameters do not affect
matching. For example:

```js
export default [
  {
    method: "GET",
    path: "/api/example",
    status: 200,
    delayMs: 150,
    response: { message: "Hello from the mock API" },
  },
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

Each fixture supports these fields:

| Field            | Behavior                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `method`, `path` | Required exact HTTP method and pathname, such as `POST` and `/api/agent/stream`.                    |
| `status`         | HTTP status; defaults to `200`. Use `503` to simulate a service failure.                            |
| `response`       | JSON value, or a function receiving the Node request and returning a JSON value.                    |
| `events`         | Array of SSE event objects, sent in order as `data: <JSON>` frames. Use this instead of `response`. |
| `delayMs`        | Delay before a JSON reply or before each SSE event.                                                 |
| `headers`        | Additional response headers.                                                                        |

The sample file includes health, search, chat, assistant, tool-agent,
analytics, query history, audit summaries, and error responses. History fixtures
support `page_num`, `page_size`, and `feedback_type=like|dislike` query parameters. Use `response` for JSON or `events` for SSE;
`delayMs` delays a JSON reply or each SSE event. Optional `headers` add response
headers, and a `response(req)` function can inspect the request. Responses carry
`X-Mock-API: true` and are stateless fixtures.

With the mock server running, check the sample endpoints:

```bash
curl -i http://127.0.0.1:5173/health
curl -X POST http://127.0.0.1:5173/search/send-search-message \
  -H 'Content-Type: application/json' -d '{"search_query":"sample"}'
curl -N -X POST http://127.0.0.1:5173/chat/send-chat-message
curl -i http://127.0.0.1:5173/api/mock-error  # sample 503 response
```

Mock middleware runs before the backend proxy. Unlisted routes still reach
`BACKEND_URL`; page navigations continue to render the app. Mocking is off by
default and is available only through the development server, so it is not
included in production builds or `yarn preview`.

## Source layout

```text
src/
├── main.tsx          # React entry point and shared stylesheet import
├── App.tsx           # App root: creates the router and renders RouterProvider
├── assets/
│   ├── fonts/        # Local web fonts
│   ├── icons/        # SVG and other icon assets
│   ├── images/       # Photos, illustrations, and other images
│   └── styles/       # Shared SCSS and Tailwind CSS entry points
├── components/       # Reusable UI, admin panels, and debug inspectors
├── config/           # Route definitions and search constants
├── models/           # Domain API/UI types, shared response envelopes, and index.ts
├── routes/           # React Router navigation and routing exports
├── services/         # Domain API requests (admin.ts, auth.ts, tools.ts), shared API exports
├── static/           # Reserved for static assets
├── store/            # Redux Toolkit store: the signed-in account
├── storybook/        # Reserved for component stories
├── utils/            # Domain selection, tool grouping, and schema helpers
└── views/
    ├── auth/         # LoginView and the session guard (session.ts)
    ├── errors/       # ErrorView (route errors) and NotFoundView
    ├── layouts/      # DefaultLayout (signed in: sidebar + heading), BlankLayout (public)
    ├── pages/        # AccountView, AdminView
    └── space/apps/   # ListView, DetailView, and AssistView, SearchView, ChatView, ToolAgentView
```

`main.tsx` loads `assets/styles/tailwind.css` and `assets/styles/styles.scss`
and mounts `App.tsx`, which creates the browser router with `createAppRouter()`
and renders React Router’s `RouterProvider`. `routes/router.tsx` defines the
route tree, following the same logic as a Vue Router setup:

- **Named routes.** Each route's `id` is its name (`auth-login`,
  `space-apps-list`, `space-apps-detail`, `pages-account`, `pages-admin`), and
  `routePath(name, params)` in `config/routes.ts` builds its URL.
- **One guard.** The root route's loader, `guard` in `views/auth/session.ts`,
  runs before every navigation (like `beforeEach`). Routes marked
  `handle: { public: true }` need no session, and the sign-in page sends a
  signed-in visitor on; every other route sends a signed-out visitor to
  `/auth/login?redirect=<path>`.
- **Two layouts** from `views/layouts/`, which leave URLs unchanged:
  `DefaultLayout` (sidebar plus the page heading from `handle.heading`) holds the
  signed-in pages: `/space/apps` (`ListView`), `/space/apps/:app_id`
  (`DetailView`, which shows the app and 404s an unknown id), `/account` and
  `/admin`. `BlankLayout` holds the public pages: `/auth/login` and
  `NotFoundView` for any other URL.
- **Lazy pages.** Each page's code loads the first time it opens.

`/` redirects to `/space/apps/assist`, preserving query parameters.
Assistant and Search read `?search_word=` into their query inputs and update it on
submission. The Tools page uses the same binding for its Tool registry discovery
input; Discover or Enter commits the keyword without changing the agent message. Back/Forward restores the input; loading a URL does not run a query.
Other query parameters and the hash are preserved when submitting. `components/NavLink.tsx` wraps React Router’s
active navigation links.

The interface uses a shared left sidebar, a page workspace, white surfaces,
and blue primary actions. On small screens the sidebar becomes compact top
navigation. Every page requires signing in at `/auth/login`, after which the user lands on
Assistant, `/space/apps/assist`, with the sidebar (or returns to the requested page); admins also get the
`/admin` page with the admin overview and analytics.

Put imported images, icons, fonts, and SCSS in `src/assets/`. Vite bundles
referenced assets with hashed filenames in `dist/assets/`; merely adding a
file does not include it in the build. Reference images from components and
fonts or background images with relative `url(...)` paths in SCSS. Empty asset
folders contain `.gitkeep` files so the structure is retained in Git.

UI and service tests live in `__tests__/` directories alongside the code they
cover. Vite configuration checks live in `tests/vite.test.cjs`.
Component state stays with its owning page or component; only the signed-in
account is shared, in the Redux store under `store/`. `static/`
and `storybook/` are empty placeholders in the local layout; Git will track
them once files are added.

When extending the app, put backend requests in the matching `services/` module (using the
`get` / `post` / `stream` helpers from `utils/request.ts`), shared
constants in `config/`, shared data contracts in `models/`, pure helpers in `utils/`, and reusable UI in `components/`.

Admin summary, analytics, history and audit requests live in `services/admin.ts`;
sign-in, sign-out, identity and permissions requests live in `services/auth.ts`;
tool registry and provider requests live in `services/tools.ts`. `services/api.ts`
re-exports these functions for existing callers. Data shapes remain in `models/`,
including auth account/profile types and history query filters. Domain services
share `RequestOptions` from the request utility for optional cancellation.
The provider-management helpers preserve
the sample `/api-tools` contract (paginated envelopes, header rows, POST updates
and deletion). They require a backend implementing those endpoints. Current
screens continue using `/admin/tools` and `/api/debug/tools`, which have different
payloads. All use the shared request client for authentication, cancellation,
timeouts, and errors. Both dev and production proxies forward `/api-tools`.
Route screens in `views/pages/` and `views/space/apps/` compose these pieces inside a layout from `views/layouts/`.

## Check

```bash
yarn lint              # ESLint: React hooks, TypeScript, and JavaScript
yarn lint:fix          # Fix lint issues where possible
yarn format            # Format source, SCSS, configuration, and docs
yarn format:check      # Check formatting without changing files
yarn typecheck         # TypeScript
yarn test:build-config # Vite proxy and production configuration
yarn test:unit         # Vitest
yarn test:unit:watch   # Vitest in watch mode
yarn test              # typecheck, build configuration, and unit tests
yarn test:ci           # lint, formatting, typecheck, production build, and all tests
```

ESLint uses `eslint.config.mjs` with JavaScript and TypeScript recommended
rules plus React hook checks. Prettier uses `.prettierrc.json` with two-space
indentation, double quotes, semicolons, and a 100-character line width.
`eslint-config-prettier` keeps formatting rules separate from lint checks.
Generated output, dependencies, local environment files, and the Yarn lockfile
are excluded from formatting. CI runs lint and formatting checks before the
build and tests.

Type checking continues to use TypeScript 7 through the `@typescript/native`
alias. The `typescript` alias supplies the TypeScript 6 API required by the
ESLint parser, following Microsoft's
[side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0).

## Deploy

The `Dockerfile` builds the bundle and serves it from nginx (non-root, port
8080). nginx forwards the backend's routes (`/api`, `/auth`, `/me`, `/admin`,
`/analytics`, `/health`, `/ready`, `/tool`, and API calls under `/chat`,
`/search`, `/tools`) to `BACKEND_URL`. Browser and backend stay on one origin,
so cookies and streaming work without CORS. To deploy against a backend on
another origin instead, build with `VITE_API_BASE_URL` and list the UI's origin
in the backend's `AGENTIC_SEARCH_CORS_ORIGINS`
([proxied or direct](#proxied-or-direct-backend-calls)).

On macOS with Colima installed, start it and select its Docker context before
building the image:

```bash
colima start
docker context use colima
docker build -t agentic-search-ui:local .
docker run -p 8080:8080 -e BACKEND_URL=http://host.docker.internal:7860 agentic-search-ui:local
```

`BACKEND_URL` defaults to `http://web:7860`, which is the backend's
`docker/docker-compose.yml` service name. nginx resolves that host when it
starts, so the container exits if the backend name doesn't resolve yet. Under
compose, the `frontend` service waits for `web` to be healthy. The backend compose file has an opt-in
`frontend` profile that builds this repo as a sibling checkout:

```bash
# in the backend repo, with this repo cloned next to it
docker compose -f docker/docker-compose.yml --profile frontend up --build
# → http://localhost:8080
```

## More

[docs/frontend.md](docs/frontend.md) covers pages and routing, dev login, admin
panels, the dev console, and the UI features.

To add a route screen:

1. Create the screen in `src/views/pages/` (or `src/views/space/apps/` for a workspace) with its
   tests in a `__tests__/` folder beside it.
2. Name the page in `ROUTE_PATHS` in `src/config/routes.ts` and register it in
   `src/routes/router.tsx` with that name as its `id`, inside `DefaultLayout`
   (or `BlankLayout` with `handle: { public: true }` for a public page). A new app
   only needs an entry in `APPS` and in `DetailView`. Add its navigation link in
   `src/components/AppSidebar.tsx`; under `DefaultLayout`, give it a page heading as the route's `handle.heading`.
3. Keep page serving aligned with the backend: update the proxy bypass in
   `vite.config.js` and the shared-prefix location in
   `nginx/default.conf.template` when the route shares a backend API prefix,
   and update `spa_page` in the backend's `src/internal/servers/web/app.py`.
