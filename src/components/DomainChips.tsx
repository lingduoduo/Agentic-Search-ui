import { X } from "lucide-react";
import { domainStyle } from "../config/sourceCategories";
import type { AutoDomains } from "../models";

/** A search source as a chip: its family-colored icon and name, optionally removable. */
export function DomainChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const { label, icon: Icon, background } = domainStyle(name);
  return (
    <span className="domain-chip">
      <span className="domain-chip__icon" style={{ background }}>
        <Icon aria-hidden="true" size={12} />
      </span>
      {label}
      {onRemove && (
        <button type="button" aria-label={`Remove ${label}`} onClick={onRemove}>
          <X aria-hidden="true" size={12} />
        </button>
      )}
    </span>
  );
}

/** What Auto chose for the last query, shared by Search and Assist. */
export function AutoDomainsNote({ autoDomains }: { autoDomains: AutoDomains }) {
  return (
    <p role="status" className="domain-chips">
      {autoDomains.status === "ok" ? (
        <>
          Auto picked:
          {autoDomains.selected.map((name) => (
            <DomainChip key={name} name={name} />
          ))}
        </>
      ) : (
        "Auto unavailable: searched web"
      )}
    </p>
  );
}
