# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: Agentic Search UI

The React 19 + Vite + TypeScript frontend for
[Agentic-Search-GRPO](https://github.com/lingduoduo/Agentic-Search-GRPO), which
owns the FastAPI backend. No component library — custom components only.

### Commands

```bash
npm install -g corepack && corepack enable  # once per Node install: provides the pinned Yarn
yarn install
yarn dev             # http://127.0.0.1:5173; proxies backend routes to BACKEND_URL (default :7860)
yarn typecheck       # TypeScript check
yarn test:unit       # Vitest
yarn build           # production bundle → dist/
yarn test:ci         # typecheck + build + unit tests, as CI runs them
```

Node 26 (CI's version). jsdom's dependencies reject Node 23, so the tests fail there.
Node 25+ no longer bundles Corepack, hence the `npm install -g corepack`.

### Running against the backend

Start the backend from the Agentic-Search-GRPO checkout (retrieval server plus
`uvicorn src.internal.servers.web.app:app --port 7860`), then `yarn dev`. The
backend repo's `bin/run_web_stack.sh` starts all of it, using this checkout from
`../Agentic-Search-UI` (override with `FRONTEND_DIR`).

### Layout

- `src/router.tsx` — the four routes (`/assist`, `/search`, `/chat`, `/tools`) and a small history router
- `src/App.tsx` — shell: topbar, global panels, and the page for the current route
- `src/pages/` — one component per route; each owns its state
- `src/components/` — panels, each independently tested (`__tests__/` beside them)
- `src/api.ts` — every backend call, including the SSE stream (`streamAgent`)
- `nginx/` + `Dockerfile` — production image: nginx serves `dist/` and proxies the backend prefixes to `BACKEND_URL`

### Keep in sync

Adding a page touches four places: `ROUTES` in `src/router.tsx`, the `bypass`
entries in `vite.config.ts`, the shared-prefix location in
`nginx/default.conf.template`, and `spa_page` in the backend's
`src/internal/servers/web/app.py`. A new backend prefix the app calls must be
added to both the Vite proxy and the nginx backend-only location.

`dev-login.html` self-registers a user, and the first user is an admin. It is
served by the Vite dev server only and must never become a build input.

See [docs/frontend.md](docs/frontend.md) for UI behavior in detail.
