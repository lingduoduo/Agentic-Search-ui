# Dataset List Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Vue sample and duplicate list implementation with one React page.

**Architecture:** ListView owns list/search/dialog state. DatasetSummary exports heading and badges shared with DatasetDetailView. DatasetDialog remains the single create/edit/delete implementation.

**Tech Stack:** React, TypeScript, React Router, Vitest.

**Spec:** docs/superpowers/specs/2026-11-13-dataset-list-design.md

## Global Constraints

No new dependencies or unsupported icon/app-count APIs. Retain URL search and explicit pagination.

## Review Focus

Existing tests cover empty lists, failed requests, search, duplicate pagination records and creation errors. Add coverage for descriptions, managed settings, save/delete refresh and read-only imported corpora.

### Task 1: Consolidate dataset list

- [x] Add behavior tests for descriptions and managed dataset settings, saving and deletion; confirm failure before implementation.
- [x] Replace sampled ListView with the existing React list plus managed settings and description rendering. Reuse DatasetDialog and add a first-page reload to useDatasets for mutations.
- [x] Extract DatasetHeading/DatasetBadges into DatasetSummary.tsx; update detail imports, router and list tests; remove DatasetsView.tsx.
- [x] Run dataset tests, full project test command, lint, format check and build. Review diff for stale imports and duplicate logic.

Validation: 534 unit tests and 7 build-config tests pass; typecheck, lint and build pass. Repository format check flags only the untouched `.impeccable/hook.cache.json`. Changed files pass formatting. Build reports an existing mixed static/dynamic import warning for NotFoundView.
