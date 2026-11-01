# Frontend development

[← Back to README](../README.md)

This guide covers the React/Webpack development workflow and local administration and observability surfaces.

## Development workflow

This repository contains the React 19.1 + Webpack + TypeScript + SCSS single-page app for [Agentic Search](https://github.com/lingduoduo/Agentic-Search-GRPO). It runs against the FastAPI backend at port 7860 and, in development, Webpack proxies the backend routes it calls — `/api/*`, `/health`, `/auth/*`, `/me`, `/admin/*`, `/analytics/*`, `/chat/*`, `/search/*`, `/tool/*` — through to port 7860. Set `BACKEND_URL` to point the proxy elsewhere (default `http://127.0.0.1:7860`). A prefix missing from that list is the usual cause of a panel or page that fails only in dev: the request hits the Webpack dev server and 404s instead of reaching FastAPI. The `/chat`, `/search` and `/tools` proxies use a context filter so a page navigation (`Accept: text/html`) is served the SPA instead of being forwarded to FastAPI — without it, a refresh on those pages 404s in dev only. The context filter matches complete path segments so `/tool` and `/tools` remain distinct.

### Pages

`src/routes/router.tsx` has two pathless layout groups. Signed-in pages sit
under `DefaultLayout` from `src/views/layouts/`, which renders
`AppSidebar` on the left and the page heading above an `Outlet`; navigation and
the global Manage tools and History controls persist across pages. The signed-in
pages are the apps list, `/space/apps` (`ListView`), one app at
`/space/apps/:app_id` (`DetailView`: `assist`, `search`, `chat` or `tools`; an
unknown id shows the not-found page), `/account` and `/admin`. Signing in lands
on `/space/apps`, and `/` redirects there. Public pages, marked
`handle: { public: true }`, sit under `BlankLayout`, with no sidebar: the sign-in
page and `NotFoundView` for unknown URLs. Route ids double as route names, and
`routePath(name, params)` in `src/config/routes.ts` builds URLs from them. Each
page's code is loaded lazily, the first time it opens.
The sidebar becomes compact top navigation on small screens.

`src/main.tsx` mounts `src/App.tsx`, which creates one router with
`createAppRouter()` and renders `RouterProvider`. `src/config/routes.ts` holds
allowed paths.
Each page owns its state, so navigating away discards unsaved work.

`ROUTE_PATHS` in `src/config/routes.ts` is mirrored in three other places, and all four
must be changed together to add a page: the proxy context filter in
`webpack.config.cjs` and the SPA-navigation location in `nginx/default.conf.template`
(both only for prefixes the backend also serves), and the `spa_page` handler in
the backend's `src/internal/servers/web/app.py`.

```bash
yarn install && yarn dev     # dev server at http://127.0.0.1:5173
yarn build                   # production bundle → dist/ (served by the nginx image)
yarn typecheck               # TypeScript check
yarn test:unit               # Vitest unit tests
```

> **Open the Webpack dev server at `http://127.0.0.1:5173`, not `:7860`.** Port 7860
> is the backend: it serves a minimal inline fallback page, or a bundle you pointed
> it at with `AGENTIC_SEARCH_FRONTEND_DIST` (stale until you rebuild). `:5173` is
> the live source with hot-reload.

## Signing in

Every page except the public ones (the sign-in page, `/auth/login`, and the
not-found page) checks the session before it mounts. The root route's loader
(`guard` in `src/views/auth/session.ts`) is the one guard and runs before every
navigation, like Vue Router's `beforeEach`. For a route marked public it only
sends a signed-in visitor past the sign-in page; otherwise it returns at once when the account is already cached
(Redux Toolkit: the `account` slice in `src/store/account.ts`), and otherwise loads `GET /me` and `GET /me/permissions`
once per page load. A `401` (or a `404` for a cookie whose user no longer exists)
redirects to `/auth/login?redirect=<original path>`; `/` first redirects to
`/space/apps`, so it becomes `?redirect=/space/apps`. Any other failure, such as the backend being down, still opens
the page and the layout shows the error.

The sign-in page posts its form to `POST /auth/login`, the same path: the dev proxy
and nginx serve the page only for an HTML navigation of exactly `/auth/login`. The
backend sets the HttpOnly `fastapiusersauth` cookie; the app never stores a token,
so the cached account, not a token, is what says "signed in". After sign-in,
`safeRedirectPath` returns the user to `redirect` only when it is one of the app's
own signed-in pages (`isRoute` in `src/config/routes.ts`); anything else, including
another origin, the sign-in page or an unknown app id, goes to `/space/apps`. **Sign out** (sidebar and `/account`) calls
`POST /auth/logout`, which clears the cookie even for an expired session.

Every backend call in `src/services/api.ts` goes through `src/utils/request.ts`
(`get` / `post` / `del`, and `stream` for SSE), which fires
`SESSION_CLEARED_EVENT` on a `401`. That drops the cached account, and the
signed-in layout (`DefaultLayout`) sends the user to `/auth/login?redirect=<current page>` —
except while the guard itself is confirming the session, since it redirects on
its own then.

Permissions come from `/me/permissions`, not the role text: every user has
`basic_access` (the four workspaces and `/account`); admins and configured super
users also have `full_admin_panel_access`, which shows the **Admin** link,
**Manage tools** and **History**, and allows `/admin`. The `/admin` loader checks
the permission before it fetches any admin data and sends other users to
`/space/apps`. The backend's `make_require_admin` guards remain the real boundary.

The app has no registration form. For local dev, create a user by opening (the
sign-in page links to it in development builds only):

```
http://127.0.0.1:5173/dev-login.html
```

and clicking **Log in**. It registers `dev@localhost` / `devpass` (idempotent), logs
in, and confirms via `/me`, so the cookie is set on the dev server's origin. The
first registered user is an admin. `yarn dev --env mock` starts signed in as an
admin; **Sign out** lasts until you sign in again on the login page, with any
email and password. Restart the dev server to reset it.

Two caveats:

- `AGENTIC_SEARCH_WEB_DB_PATH` defaults to `:memory:`, so the user disappears when
  the backend restarts — the app returns to `/auth/login`; click **Log in** on
  `dev-login.html` again, or start the backend with a file
  DB (`AGENTIC_SEARCH_WEB_DB_PATH=data/web.db`) to make it stick.
- `dev-login.html` is served by the Webpack dev server only. It is not a build input,
  so `yarn build` does not emit it into `dist/`, and the nginx image never serves it. Keep it that way: the first
  registered user becomes an **admin**, so a self-registering page must never be
  reachable from a real deployment.

## Admin dashboard

Debug panels also require an authenticated admin when enabled. Their request
traces and retrieval diagnostics use the same admin guard as the dashboard;
the debug enablement flag alone does not grant access.

Admins get the `/admin` page — **Admin overview** and **Analytics** — and two
sidebar buttons, **Manage tools** and **History**, which toggle their panels above
the current page. The tools
button is labelled _Manage tools_, not _Tools_: the **Tools** nav link goes to the
tool-agent page instead, and the two used to share a label. They call the
`/admin/*` and `/analytics/*` routers, which are **admin-authenticated**. The
exact path `/admin` is the SPA page; `/admin/*` stays backend-only in the Webpack
proxy and nginx. Two things make them work locally:

1. **Proxy** — the Webpack dev server already forwards `/admin` and `/analytics` to
   the backend (above), so requests reach FastAPI on `:7860`.
2. **Auth** — the panels are gated by `make_require_admin`. For local dev, set
   `AGENTIC_SEARCH_DEV_ADMIN=1` (default off) so every admin endpoint accepts the
   request as a dev admin — **no token or cookie needed**:

```bash
AGENTIC_SEARCH_DEV_ADMIN=1 PYTHONPATH=src:. \
  uvicorn src.internal.servers.web.app:app --host 127.0.0.1 --port 7860
```

The startup log prints `ADMIN AUTH BYPASSED …` when it's active. **Dev only —
never set this in production.** Without the flag the endpoints return `401` and
you'd need an admin JWT in the `fastapiusersauth` cookie instead. The bypass does
not change `/me/permissions`, so the app still needs a signed-in admin account to
show the admin controls.

Empty panels — e.g. **Manage tools** with no registered
tools — are expected when nothing is configured locally, not an error.

## Dev console

A gated, dev-only console for inspecting the backend servers from the web UI. **Off by default** — enable both flags (never in production):

```bash
  # backend: mount /api/debug/* on the web app
AGENTIC_SEARCH_DEBUG_PANELS=1 PYTHONPATH=src:. \
  uvicorn src.internal.servers.web.app:app --host 127.0.0.1 --port 7860
  # frontend: reveal the "Console" toggle in the top bar
VITE_DEBUG_PANELS=1 yarn dev
```

Click **Console** in the top bar to open it. **Retrieval Lab** runs a query against each per-mode endpoint (`sparse` / `dense` / `hybrid` / `graph`) via the `POST /api/debug/retrieval/{mode}` proxy and shows results side by side, surfacing **503** (dense not configured → hybrid collapses to sparse) and **404** (endpoint not mounted, e.g. against `demo.py`) explicitly instead of as a generic error. The console also hosts the Request Inspector, Request Trace, Server Health, Query Transform Inspector, Evaluation Results and Tool Catalog panels. **Route Latency** (`LatencyPanel.tsx`, from `GET /api/debug/latency`) lists calls, errors and p50/p95/max ms per route, slowest p95 first, plus a retrieval-vs-generation stage table (auxiliary LLM calls listed apart). **Evaluation Results** groups each file's numbers into retrieval / generation / reward / latency / other.

## UI features

**Streaming answers** (`AnswerPanel.tsx` → `ProgressLog`) — every query streams over SSE; `streamAgent` (`src/services/api.ts`) drives the UI from the `progress` / `claim` / `trace` / `approval_required` / `escalation_required` / `answer` / `done` events (full schema in the [SSE event table](https://github.com/lingduoduo/Agentic-Search-GRPO/blob/main/docs/architecture.md#intent-routing)). While the agent runs, a live **Agent reasoning** log renders one row per turn (`⟳ Turn N · writing answer…` active, `✓ Turn N · <tool> · N docs` completed) and answer tokens stream in as markdown; on `done` the log collapses to a one-line summary (`✓ 3 turns`) with a **show reasoning ▸** toggle that re-expands the full trace. Backend side, each turn fires the `on_turn` callback (`OnTurnCallback`) → a `progress` event on the `AgentRunDriver` queue (`src/internal/servers/web/run_driver.py`), which also carries `claim` / `trace` events and closes the run with the `answer` / `done` pair. The **New** button (`handleNewSession`, on the Assistant page) aborts any in-flight request and clears answer / citations / documents / messages / intent and any pending approval or escalation cards; the backend cancels the run when the stream's client disconnects.

**On the Assistant page the answer arrives claim by claim, not token by token**
(`AssistView.tsx`). The grounded path's answer _is_ the join of the claims it has
verified, so `streamAgent` accumulates each `claim` event onto the running answer
separated by a space and renders it immediately. The terminal `answer` event then
**overwrites** that accumulation rather than appending to it — it is the
authoritative text, which is what makes a dropped `claim` event cosmetic instead of
lossy. `trace` events feed the Dev Console control-flow panel and
`approval_required` events populate the pending-approval list.
`escalation_required` events (a side-effecting tool call failed) render a
`ToolEscalationCard` — on the Assistant and Tools pages — with **Retry** /
**Skip** / **Cancel**, posted to `POST /api/agent/escalations/{id}` via
`submitToolEscalation`; the card counts down to the escalation's expiry.

**Degraded answers on the Chat and Tools pages** (`Transcript.tsx`) — when the
model is unavailable, `/chat` and `/tool` answer anyway and mark the `done`
event with `degraded: "model_unavailable"`. `ChatView` and `ToolAgentView` copy
it onto the assistant turn, and the transcript shows
`⚠ Model unavailable — degraded answer` under it (the reason in its `title`).

**Markdown rendering** — Answers render via `react-markdown`: headings, bold/italic, inline code, code blocks, and ordered/unordered lists. Citation markers (`[D1]`, `[D2]`, …) become anchor links that scroll the page to the matching source card.

**Chat history** — Session timeline renders as a chat bubble layout: user messages right-aligned, assistant messages left-aligned. System messages are filtered out. Keys are stable against message prepend/removal.

**Source cards** (`SourceGrid.tsx`) — `SourceGrid` is a thin mapper over a controlled `SourceCard` (memoised, per-document, owning its own `expanded` / `copied` state). Each card renders one `SourceDocumentView` (`{ id, citation, title, content, url, score, metadata }`) and:

- collapses content to 3 lines by default (`source-content--clamped`); **show more ▾** / **show less ▴** toggles per card.
- a **⎘ copy** button copies the full content and flips to "copied ✓" for 1.5 s.
- carries `id="source-{citation}"` so `[D1]`-style anchor links from the answer scroll to it.
- color-codes the relevance score via `scoreColor()` (green ≥ 0.7, amber ≥ 0.4, orange > 0, grey for 0).
- shows a category chip line ("a · b", or a single "a") listing the search-source categories that found the page whenever `metadata.categories` is a non-empty list (the key is set only by multi-category searches).
- tags the source provider with a colored pill via `SOURCE_COLORS` (Browser Retrieval, SerpAPI, Local Retrieval, All Active Sources; grey fallback).

Source cards are frontend-only (no dedicated backend endpoint): they are populated from the `documents` array of the `POST /api/agent` response (see the [Web backend API](https://github.com/lingduoduo/Agentic-Search-GRPO/blob/main/docs/api-reference.md#web-backend-api)); the retrieval server returns the same fields as `results[]` from `POST /search`. Inspect that backing data with:

```bash
curl -s -X POST http://localhost:7860/api/agent \
  -H "Content-Type: application/json" \
  -d '{"query": "What is FAISS?", "top_k": 3}' \
  | python -c "import sys, json; [print(d['citation'], round(d['score'],2), d['title']) for d in json.load(sys.stdin)['documents']]"
  # → [D1] 0.81 FAISS: A Library for Efficient Similarity Search ...
```

**Tool Call Trace Panel** — When the agent runs in `tool` mode, a panel below the answer shows every tool call: name, status (✓ / ✗), arguments as JSON, result summary (first 200 chars or "N items" for lists), and latency in ms. Failed calls render with a red border and the error message.

**Intent-adaptive layout** — `AssistView.tsx` reads `response.intent` (set from the `done` SSE event via `setIntent`) and applies `intent-${intent}` to the `.results-layout` container; when `intent` is undefined no class is added and the layout falls back to the default single-column stack. The behaviour is **CSS-only** — `styles.scss` rules consume the class to reflow the existing panels (no extra components), keyed off stable hooks `.answer-column`, `.sources-panel`, `.session-panel`, and `.tool-trace-panel`:

| Intent           | `.results-layout` class | Layout                                                                                        |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `search`         | `intent-search`         | Single column; `.sources-panel` gets a highlighted border; `.session-panel` dimmed            |
| `chat`           | `intent-chat`           | `.answer-column` + `.session-panel` side-by-side (≥720 px); `.sources-panel` full-width below |
| `tool`           | `intent-tool`           | `.tool-trace-panel` full-width hero; `.sources-panel` and `.session-panel` side-by-side below |
| narrow (≤720 px) | —                       | All intents fall back to a single-column grid stack                                           |

The intent itself comes from the backend's routing decision — see the `response.intent` contract under the [Web backend API](https://github.com/lingduoduo/Agentic-Search-GRPO/blob/main/docs/api-reference.md#web-backend-api). No new endpoints back this feature; the layout is a pure function of that one field.

`intent` describes what surfaced, while the `done` payload and request inspector expose why and how it ran. Auto requests may include `route`, `route_degraded`, `search_mode`, and `external_provider` metadata. For example, a bare `GRPO` query can display search results from SerpAPI or browser retrieval after the internal sufficiency gate fails; if no provider returns evidence, the sources panel remains empty and the answer reports no results. See [API request routing](https://github.com/lingduoduo/Agentic-Search-GRPO/blob/main/docs/request-routing.md).

**Intent badge** (`AnswerPanel.tsx`) — a pill under the answer summarising what ran, derived from `response.intent` + counts: `Searched · 5 sources`, `Answered · 3 citations`, or `Used tools`. Hidden when the answer is empty or the intent is undefined.

**Example-query chips** (`SearchComposer.tsx`) — three chips under the search box, one per routing intent, that populate and run a representative query in a single click so the intent router can be exercised without knowing what triggers each path: 🔍 `find the onboarding checklist` (search), 💬 `explain how FAISS indexing works` (chat), 🛠 `summarize the latest sales figures and chart them` (tool). The chips are hidden while a request is in flight.

**Components** (`src/components/`) — each panel is a focused, independently tested unit:

| Component            | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchComposer`     | Single input box (no mode selector), per-intent example-query chips, a **Search source** checkbox group (options from `GET /api/search-domains`, default `web`; up to three categories, sent as `domains` when several are chosen; choosing a category replaces `web`, and `web` resets the selection even at the limit; tooltip shows each category's topics and typical sources, a single category is sent as the agent request's `domain`: a query hint for web search providers, not a result filter; an **Auto** checkbox first in the group clears the other choices, is cleared by ticking a category, and sends `domains: ["auto"]`; after the response the page shows "Auto picked: a · b" or "Auto unavailable: searched web", and the selection stays on Auto — see [automatic category selection](https://github.com/lingduoduo/Agentic-Search-GRPO/blob/main/docs/search-engine.md#automatic-category-selection)), source-provider / retrieval-URL / top-K controls, Cmd+Enter submit |
| `AnswerPanel`        | Streamed markdown answer + intent badge + `[D1]` citation anchor links                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `SourceGrid`         | Expand/collapse source cards with copy-to-clipboard and citation `id` anchors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `SessionTimeline`    | Chat-bubble history (user right, assistant left; system filtered)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ToolCallTracePanel` | Per-tool-call trace (name, ✓/✗ status, JSON args, result summary, latency) for `tool` intent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `AdminOverview`      | Single-call health snapshot — connectors, indexing, users, auth, models, tools, analytics with a composite health score                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `AnalyticsDashboard` | Usage breakdowns by LLM, persona, and flow (`getAnalyticsBy*`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `QueryHistoryPanel`  | Per-user query history with CSV export (`getQueryHistory`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ToolAdminPanel`     | Admin view of MCP/OpenAPI tools registered via `tool_registry`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

API client functions live in `src/services/api.ts`: `runAgent` / `streamAgent` (SSE), `createSession` / `getSession`, `getAdminSummary`, `getAnalyticsByLLM` / `getAnalyticsByPersona` / `getAnalyticsByFlow`, `getQueryHistory`, `getAuditSummary`, `submitFeedback`.

**Feedback loop (UI → fine-tuning)** — the thumbs bar under the answer (`AnswerPanel`) posts session thumbs to `POST /api/feedback` via `submitSessionFeedback(sessionId, signal, target)`: a thumbs-up goes as `overall`, a thumbs-down first asks whether the _Sources_ (`retrieval`), the _Answer_ (`generation`) or _Both_ (`overall`) were at fault. `submitFeedback(chatMessageId, isPositive, feedbackText?)` posts per-message like/dislike to `POST /chat/create-chat-message-feedback` (exported; no component calls it today); `QueryHistoryPanel` can filter sessions by `feedback_type` (`like` / `dislike`). These ratings are exactly what `load_feedback_examples` reads back into [feedback-driven GRPO](https://github.com/lingduoduo/Agentic-Search-GRPO/blob/main/docs/training-and-evaluation.md#fine-tune-from-user-feedback) — the human-feedback signal that fine-tunes the policy.

## Tests

```bash
yarn typecheck               # TypeScript check
yarn build                   # production bundle → dist/ (served by the nginx image)
yarn test:unit               # Vitest unit tests (vitest run)
yarn test                    # typecheck, then the unit tests
```

Frontend tests live under `src/__tests__/`, `src/views/auth/__tests__/`, `src/views/space/apps/__tests__/`, `src/components/__tests__/`,
`src/components/debug/__tests__/`,
`src/services/__tests__/`, `src/routes/__tests__/`, and `src/utils/__tests__/`. A few of the
component tests:

| Test file                     | What is tested                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `App.test.tsx`                | SSE streaming flow, intent class applied per response, reset on new session          |
| `AnswerPanel.test.tsx`        | Markdown rendering, `[D1]` citation link generation, `ReactNode[]` children handling |
| `SessionTimeline.test.tsx`    | Chat bubble layout, system message filtering, stable React keys                      |
| `SourceGrid.test.tsx`         | Card expand/collapse, copy button 1.5 s feedback, `id` anchor attribute              |
| `ToolCallTracePanel.test.tsx` | Empty→null, completed/failed card classes, latency display, JSON arguments           |
