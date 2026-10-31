# Agentic Search UI

The React 19 + Vite + TypeScript frontend for
[Agentic Search](https://github.com/lingduoduo/Agentic-Search-GRPO). It's a
single-page app with four routes: **Assistant** (`/assist`), **Search**
(`/search`), **Chat** (`/chat`), and **Tools** (`/tools`). It talks to the
FastAPI backend over same-origin HTTP and SSE.

## Develop

Start the backend first (see the backend README): retrieval server plus web
backend on port 7860. Then:

```bash
corepack enable      # once per Node install: provides the pinned Yarn
yarn install
yarn dev             # http://127.0.0.1:5173, proxies backend routes to :7860
```

If the backend runs somewhere else, point the dev proxy at it:

```bash
BACKEND_URL=http://127.0.0.1:7861 yarn dev
```

For a dev login, open `http://127.0.0.1:5173/dev-login.html` (dev server only).

## Check

```bash
yarn typecheck       # TypeScript
yarn test:unit       # Vitest
yarn build           # production bundle → dist/
yarn test:ci         # all three, as CI runs them
```

## Deploy

The `Dockerfile` builds the bundle and serves it from nginx (non-root, port
8080). nginx forwards the backend's routes (`/api`, `/auth`, `/me`, `/admin`,
`/analytics`, `/health`, `/ready`, `/tool`, and API calls under `/chat`,
`/search`, `/tools`) to `BACKEND_URL`. Browser and backend stay on one origin,
so cookies and streaming work without CORS.

```bash
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

Adding a page touches four places that must stay in sync: `ROUTES` in
`src/router.tsx`, the `bypass` entries in `vite.config.ts`, the shared-prefix
location in `nginx/default.conf.template`, and `spa_page` in the backend's
`src/internal/servers/web/app.py`.
