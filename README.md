# Agentic Search UI

The React 19 + Vite + TypeScript frontend for
[Agentic Search](https://github.com/lingduoduo/Agentic-Search-GRPO). It's a
single-page app with four routes: **Assistant** (`/assist`), **Search**
(`/search`), **Chat** (`/chat`), and **Tools** (`/tools`). It talks to the
FastAPI backend over same-origin HTTP and SSE.

## Develop

Use Node.js 26 (the version used by CI and Docker) and Yarn 1.22.22
(pinned in `package.json`). Start the backend first (see the backend README):
retrieval server plus web backend on port 7860. Then:

```bash
npm install -g corepack && corepack enable  # once per Node install: provides the pinned Yarn
yarn install
yarn dev             # http://127.0.0.1:5173, proxies backend routes to :7860
```

If the backend runs somewhere else, point the dev proxy at it:

```bash
BACKEND_URL=http://127.0.0.1:7861 yarn dev
```

For a dev login, open `http://127.0.0.1:5173/dev-login.html` (dev server only).

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
├── styles/           # Shared styles (styles.css)
└── utils/            # Domain selection, tool grouping, and schema helpers
```

`main.tsx` loads `styles/styles.css` and mounts `apps/App.tsx`. The app shell
selects a screen from `pages/` using the current route. `config/routes.ts`
defines the allowed paths, `routes/navigation.ts` handles browser history,
`hooks/useRoute.ts` subscribes to route changes, and `components/NavLink.tsx`
renders navigation links. `routes/index.ts` exports the routing API.

Tests live in `__tests__/` directories alongside the code they cover.
Component state stays with its owning page or component. `store/`, `static/`,
and `storybook/` are empty placeholders in the local layout; Git will track
them once files are added.

When extending the app, put backend requests in `services/api.ts`, shared
constants in `config/`, shared data contracts in `interfaces/`, React hooks
in `hooks/`, pure helpers in `utils/`, and reusable UI in `components/`.
Route screens in `pages/` compose these pieces, while `apps/` owns the shell.

## Check

```bash
yarn typecheck       # TypeScript
yarn test:unit       # Vitest
yarn test:unit:watch # Vitest in watch mode
yarn test            # typecheck and unit tests
yarn build           # production bundle → dist/
yarn test:ci         # all three, as CI runs them
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
3. Keep page serving aligned with the backend: update the `bypass` entries in
   `vite.config.ts` and the shared-prefix location in
   `nginx/default.conf.template` when the route shares a backend API prefix,
   and update `spa_page` in the backend's `src/internal/servers/web/app.py`.

The Vite development server and nginx deployment handle backend proxying.
`yarn preview` serves the production bundle on `http://127.0.0.1:4173` for
static inspection; it does not configure the backend proxy.
