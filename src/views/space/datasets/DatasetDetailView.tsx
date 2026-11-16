import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import { useDataset } from "../../../hooks/useDataset";
import { routePath } from "../../../config/routes";
import { importDataset } from "../../../services/api";
import { DatasetSummary } from "./DatasetSummary";
import { DatasetDialog } from "./DatasetDialog";
import { ListView as DocumentListView } from "./documents/ListView";

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** Older detail bookmarks keep the complete URL and catalog return state. */
export function LegacyDatasetRedirect() {
  const { name = "" } = useParams();
  const location = useLocation();
  return (
    <Navigate
      replace
      to={{
        pathname: routePath("space-datasets-documents-list", { name }),
        search: location.search,
        hash: location.hash,
      }}
      state={location.state}
    />
  );
}

/** One corpus and its documents; switching corpora resets local dialogs and actions. */
export function DatasetDetailView() {
  const name = useParams().name ?? "";
  return <DatasetDetails key={name} name={name} />;
}

function DatasetDetails({ name }: { name: string }) {
  const location = useLocation();
  const catalog = location.state?.catalog;
  const navigate = useNavigate();
  const { dataset, error: datasetError, reload: reloadDataset } = useDataset(name);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [actionError, setActionError] = useState("");
  const managed = dataset?.managed ?? false;

  async function handleImport() {
    setImporting(true);
    setActionError("");
    try {
      await importDataset(name);
      setDocumentRevision((revision) => revision + 1);
      reloadDataset();
    } catch (cause) {
      setActionError(messageOf(cause, "Unable to import the dataset."));
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="datasets-detail" aria-label={`Dataset ${name}`}>
      <Link
        className="datasets-detail__back"
        to={{
          pathname: routePath("space-datasets"),
          search: typeof catalog?.search === "string" ? catalog.search : "",
          hash: typeof catalog?.hash === "string" ? catalog.hash : "",
        }}
      >
        ← All datasets
      </Link>

      {datasetError && (
        <div className="error-banner" role="alert">
          <span>{datasetError}</span>
          <button
            type="button"
            className="account-retry"
            aria-label="Retry loading the dataset"
            onClick={reloadDataset}
          >
            Retry
          </button>
        </div>
      )}
      {dataset && (
        <div className="source-card datasets-detail__summary">
          <DatasetSummary dataset={dataset} />
          <div className="datasets-detail__actions">
            {managed ? (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
                Edit dataset
              </button>
            ) : (
              <>
                <span>Import this corpus to edit it; its file stays as it is.</span>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={importing || !dataset.available}
                  onClick={() => void handleImport()}
                >
                  {importing ? "Importing…" : "Import to manage"}
                </button>
              </>
            )}
            {dataset.updated_at && (
              <small>Updated {new Date(dataset.updated_at).toLocaleString()}</small>
            )}
          </div>
          {managed && dataset.served !== true && (
            <p className="datasets-detail__note" role="note">
              Search sees changes after the retrieval server restarts with this corpus.
            </p>
          )}
        </div>
      )}
      {actionError && (
        <div className="error-banner" role="alert">
          <span>{actionError}</span>
        </div>
      )}

      <DocumentListView
        key={`${name}:${documentRevision}`}
        datasetName={name}
        managed={managed}
        available={dataset?.available ?? false}
        onChanged={reloadDataset}
      />

      {editing && dataset && (
        <DatasetDialog
          mode={{ kind: "edit", dataset }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reloadDataset();
          }}
          onDeleted={() => void navigate(routePath("space-datasets"))}
        />
      )}
    </section>
  );
}
