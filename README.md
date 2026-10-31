# Agentic Search UI

The React 19.1 + Webpack + TypeScript + SCSS frontend for
[Agentic Search](https://github.com/lingduoduo/Agentic-Search-GRPO). It's a
single-page app with four routes: **Assistant** (`/assist`), **Search**
(`/search`), **Chat** (`/chat`), and **Tools** (`/tools`). It talks to the
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
yarn start:app --env keepghost
```

Set `BACKEND_URL` in `.env.keepghost.local` or `.env.keepghost` for that
backend. Named environments still run in development mode on port 5173.
`--env name=keepghost` is also supported. Without a backend override, the
proxy uses `http://127.0.0.1:7860`.

For a dev login, open `http://127.0.0.1:5173/dev-login.html` (dev server only).

Webpack compiles TypeScript and React with SWC, compiles SCSS with Dart Sass,
and generates `index.html` with hashed production assets in `dist/`. React and
React DOM are constrained to the 19.1 patch series. Configure the build and
dev server in `webpack.config.cjs`. Vitest uses `vitest.config.ts`; Vite and
its React plugin are retained only as test tooling.

For a production build and local static preview:

```bash
yarn build           # TypeScript check, then Webpack output → dist/
yarn preview         # http://127.0.0.1:4173, serves the existing dist/
```

The preview has SPA route fallback but no backend proxy. Use `yarn dev` or the
nginx container to exercise authenticated requests and streaming against the
backend. `dev-login.html` is available only through `yarn dev` and is excluded
from the production bundle.

Webpack configuration lives in `webpack.config.cjs`; `index.html` is the HTML
template and Webpack injects the generated scripts and stylesheet links.
Shared styles live in `src/styles/styles.scss`. Webpack processes SCSS through
`sass-loader` and `css-loader`, injects styles during development, and extracts
CSS for production. Plain CSS imports remain supported.
Development uses hot module replacement and source maps. Production cleans
`dist/`, extracts CSS, and splits React, icons, and dynamically imported code
into hashed assets without source maps.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BACKEND_URL` | `http://127.0.0.1:7860` in development | Backend proxy target; nginx uses `http://web:7860` by default. |
| `VITE_DEBUG_PANELS` | Disabled | Set to `1` to enable debug panels; the existing name is preserved for compatibility. |

For example:

```bash
VITE_DEBUG_PANELS=1 BACKEND_URL=http://127.0.0.1:7861 yarn dev
```

Webpack reads environment values in this order, with the first value taking
priority: shell variables, `.env.<mode>.local`, `.env.local`, `.env.<mode>`,
then `.env`. The mode is `development` for `yarn dev` and `production` for
`yarn build`. A named environment replaces `<mode>` in those file names
without changing the Webpack build mode. The debug flag is embedded during
compilation, so restart the dev server or rebuild after changing it. Only the explicitly configured debug
flag is exposed to browser code.

## Mock API

Start the Webpack dev server at `http://127.0.0.1:5173` with sample API
responses. Open `/assist`, `/search`, `/chat`, or `/tools` to try the fixtures:

```bash
yarn start:mock
# or combine mocks with a named backend environment:
yarn start:app --env keepghost --env mock
```

The sample [mocks/config.js](mocks/config.js) contains the response fixtures;
[mocks/middleware.js](mocks/middleware.js) handles matching and delivery.
Edit the config to add fixtures, then restart the dev server. Each entry
matches an exact HTTP method and pathname; query parameters do not affect
matching. For example:

```js
export default [
  {
    method: 'GET',
    path: '/api/example',
    status: 200,
    delayMs: 150,
    response: { message: 'Hello from the mock API' },
  },
  {
    method: 'POST',
    path: '/chat/send-chat-message',
    events: [
      { type: 'answer', text: 'Mock streaming answer' },
      { type: 'done', session_id: 'mock-session' },
    ],
  },
];
```

Each fixture supports these fields:

| Field | Behavior |
| --- | --- |
| `method`, `path` | Required exact HTTP method and pathname, such as `POST` and `/api/agent/stream`. |
| `status` | HTTP status; defaults to `200`. Use `503` to simulate a service failure. |
| `response` | JSON value, or a function receiving the Node request and returning a JSON value. |
| `events` | Array of SSE event objects, sent in order as `data: <JSON>` frames. Use this instead of `response`. |
| `delayMs` | Delay before a JSON reply or before each SSE event. |
| `headers` | Additional response headers. |

The sample file includes health, search, chat, assistant, tool-agent,
analytics, and error responses. Use `response` for JSON or `events` for SSE;
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
├── apps/             # App.tsx shell, navigation, global panels, and tests
├── components/       # Reusable UI, admin panels, and debug inspectors
├── config/           # Route definitions and search constants
├── hooks/            # Route subscriptions and canonical URL hooks
├── interfaces/       # Shared API and UI types (index.ts)
├── pages/            # Assistant, Search, Chat, and Tools route screens
├── routes/           # Browser history navigation and routing exports
├── services/         # Backend HTTP and SSE client (api.ts)
├── static/           # Reserved for static assets
├── store/            # Reserved for shared application state
├── storybook/        # Reserved for component stories
├── styles/           # Shared styles (styles.scss)
└── utils/            # Domain selection, tool grouping, and schema helpers
```

`main.tsx` loads `styles/styles.scss` and mounts `apps/App.tsx`. The app shell
selects a screen from `pages/` using the current route. `config/routes.ts`
defines the allowed paths, `routes/navigation.ts` handles browser history,
`hooks/useRoute.ts` subscribes to route changes, and `components/NavLink.tsx`
renders navigation links. `routes/index.ts` exports the routing API.

UI and service tests live in `__tests__/` directories alongside the code they
cover. Webpack configuration checks live in `tests/webpack.test.cjs`.
Component state stays with its owning page or component. `store/`, `static/`,
and `storybook/` are empty placeholders in the local layout; Git will track
them once files are added.

When extending the app, put backend requests in `services/api.ts`, shared
constants in `config/`, shared data contracts in `interfaces/`, React hooks
in `hooks/`, pure helpers in `utils/`, and reusable UI in `components/`.
Route screens in `pages/` compose these pieces, while `apps/` owns the shell.

## Check

```bash
yarn typecheck         # TypeScript
yarn test:build-config # Webpack proxy and production configuration
yarn test:unit         # Vitest
yarn test:unit:watch   # Vitest in watch mode
yarn test              # typecheck, build configuration, and unit tests
yarn test:ci           # typecheck, production build, and all tests
```

## Deploy

The `Dockerfile` builds the bundle and serves it from nginx (non-root, port
8080). nginx forwards the backend's routes (`/api`, `/auth`, `/me`, `/admin`,
`/analytics`, `/health`, `/ready`, `/tool`, and API calls under `/chat`,
`/search`, `/tools`) to `BACKEND_URL`. Browser and backend stay on one origin,
so cookies and streaming work without CORS.

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

1. Create the screen in `src/pages/` and its tests in `src/pages/__tests__/`.
2. Add the pathname to `ROUTES` in `src/config/routes.ts` and render the screen
   from `src/apps/App.tsx`. Navigation helpers live in `src/routes/index.ts`.
3. Keep page serving aligned with the backend: update the proxy context filter in
   `webpack.config.cjs` and the shared-prefix location in
   `nginx/default.conf.template` when the route shares a backend API prefix,
   and update `spa_page` in the backend's `src/internal/servers/web/app.py`.
