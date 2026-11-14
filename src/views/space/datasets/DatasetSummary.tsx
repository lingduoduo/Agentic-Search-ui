import { Database } from "lucide-react";
import type { DatasetView } from "../../../models";

/** Dataset identity and status, shared by the catalog and detail page. */
export function DatasetSummary({ dataset }: { dataset: DatasetView }) {
  return (
    <>
      <DatasetHeading dataset={dataset} />
      {dataset.description && (
        <span className="source-card__description">{dataset.description}</span>
      )}
      <code className="datasets-catalog__path">{dataset.path ?? "No path"}</code>
      <DatasetBadges dataset={dataset} />
    </>
  );
}

function DatasetHeading({ dataset }: { dataset: DatasetView }) {
  return (
    <span className="source-card__heading">
      <span className="source-option__icon source-card__icon datasets-catalog__icon">
        <Database aria-hidden="true" size={20} />
        <img
          key={dataset.name}
          src={`https://picsum.photos/seed/${encodeURIComponent(dataset.name)}/400`}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      </span>
      <span className="datasets-catalog__identity">
        <strong className="source-option__name">{dataset.source}</strong>
        <small>
          {[
            dataset.name,
            dataset.domain,
            dataset.docs === null ? "" : `${dataset.docs.toLocaleString()} docs`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
    </span>
  );
}

function DatasetBadges({ dataset }: { dataset: DatasetView }) {
  return (
    <span className="datasets-catalog__badges">
      {dataset.managed && <span className="route-pill">Managed</span>}
      {dataset.served && <span className="route-pill">Serving</span>}
      {!dataset.available && <span className="route-pill route-pill--degraded">File missing</span>}
    </span>
  );
}
