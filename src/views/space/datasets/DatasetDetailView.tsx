import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useDataset } from "../../../hooks/useDataset";
import { routePath } from "../../../config/routes";
import { importDataset } from "../../../services/api";
import { DatasetSummary } from "./DatasetSummary";
import { DatasetDialog } from "./DatasetDialog";
import { ListView as DocumentListView } from "./documents/ListView";
import { SearchTestPanel } from "./SearchTestPanel";

const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** `/space/datasets/:name`: one corpus and its documents, a table page at a time. */
export function DatasetDetailView() {
  const name = useParams().name ?? "";
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
      <Link className="datasets-detail__back" to={routePath("space-datasets")}>
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

      {dataset?.available && <SearchTestPanel datasetName={name} />}

      <DocumentListView
        key={`${name}:${documentRevision}`}
        datasetName={name}
        managed={managed}
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
