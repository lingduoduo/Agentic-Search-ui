import { Link, useNavigate, useParams } from "react-router";
import { routePath } from "../../../config/routes";
import { useDataset } from "../../../hooks/useDataset";
import { UploadForm } from "./documents/UploadForm";

/** Upload documents to an existing managed dataset. */
export function CreateView() {
  const name = useParams().name ?? "";
  const navigate = useNavigate();
  const { dataset, error, reload } = useDataset(name);
  const back = routePath("space-datasets-detail", { name });

  return (
    <section className="datasets-detail" aria-label="Add files">
      <Link className="datasets-detail__back" to={back}>
        ← Back to documents
      </Link>
      <h2>Add files</h2>
      {error ? (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="account-retry" onClick={reload}>
            Retry
          </button>
        </div>
      ) : !dataset ? (
        <p role="status">Loading dataset…</p>
      ) : dataset.managed ? (
        <UploadForm
          key={name}
          datasetName={name}
          review
          onClose={() => void navigate(back)}
          onUploaded={reload}
        />
      ) : (
        <p>Import this dataset before adding files.</p>
      )}
    </section>
  );
}
