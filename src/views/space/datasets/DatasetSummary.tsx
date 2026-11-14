import { Database } from "lucide-react";
import type { DatasetView } from "../../../models";

/** Icon tile, label and the "name · domain · docs" line, shared by card and detail page. */
export function DatasetHeading({ dataset }: { dataset: DatasetView }) {
  return (
    <span className="source-card__heading">
      <span className="source-option__icon source-card__icon datasets-catalog__icon">
        <Database aria-hidden="true" size={20} />
      </span>
      <span>
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

export function DatasetBadges({ dataset }: { dataset: DatasetView }) {
  return (
    <span className="datasets-catalog__badges">
      {dataset.managed && <span className="route-pill">Managed</span>}
      {dataset.served && <span className="route-pill">Serving</span>}
      {!dataset.available && <span className="route-pill route-pill--degraded">File missing</span>}
    </span>
  );
}
