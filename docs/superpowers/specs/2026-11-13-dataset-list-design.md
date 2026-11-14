# Dataset list consolidation

Approved by the user with “go”. Convert the Vue sample into the single React dataset list page at `src/views/space/datasets/ListView.tsx`, replacing `DatasetsView.tsx`. Reuse DatasetDialog for creation, settings and deletion; extract DatasetHeading and DatasetBadges for list/detail reuse. Show supported descriptions and retain the existing API model, URL search, explicit pagination and error states. No new dependencies or unsupported icon/app-count APIs.

Approaches: a literal Vue port would duplicate existing hooks/dialogs and require unsupported APIs. Keeping two list pages would retain duplication. Consolidating around the working React implementation is the approved approach.
