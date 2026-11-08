import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SearchDomainOption } from "../models";
import { AUTO, MAX_SEARCH_DOMAINS, toggleDomain } from "../utils/domains";

interface SourcePickerProps {
  domains: string[];
  options: SearchDomainOption[];
  onChange: (domains: string[]) => void;
  disabled?: boolean;
}

export function SourcePicker({ domains, options, onChange, disabled = false }: SourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const hintId = `${id}-hint`;
  const atLimit = domains.filter((d) => d !== "web" && d !== AUTO).length >= MAX_SEARCH_DOMAINS;
  const label =
    domains.includes("web") || !domains.length
      ? "All sources"
      : domains.includes(AUTO)
        ? "Auto"
        : `${domains[0].replace(/_/g, " ")}${domains.length > 1 ? ` + ${domains.length - 1}` : ""}`;

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div
      className="source-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="source-picker__trigger"
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(!open);
          setFilter("");
        }}
      >
        <span>Sources: {label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && !disabled && (
        <div className="source-picker__popover" id={id}>
          <input
            type="search"
            aria-label="Find a source"
            placeholder="Find a source…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
          <fieldset className="search-sources">
            <legend>Search source</legend>
            <label title="Search without a category restriction">
              <input
                type="checkbox"
                checked={domains.includes("web") || !domains.length}
                onChange={() => onChange(["web"])}
              />
              All sources
            </label>
            <label title="Pick up to three categories automatically">
              <input
                type="checkbox"
                checked={domains.includes(AUTO)}
                onChange={() => onChange(toggleDomain(domains, AUTO))}
              />
              Auto
            </label>
            <div className="source-picker__options">
              {options
                .filter((option) => option.name !== "web" && option.name !== AUTO)
                .filter((option) =>
                  `${option.name.replace(/_/g, " ")} ${option.description}`
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((option) => {
                  const checked = domains.includes(option.name);
                  const blocked = !checked && atLimit;
                  return (
                    <label
                      key={option.name}
                      title={[option.description, option.typical_sources?.join(", ")]
                        .filter(Boolean)
                        .join(" — ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={blocked}
                        aria-label={option.name.replace(/_/g, " ")}
                        aria-describedby={blocked ? hintId : undefined}
                        onChange={() => onChange(toggleDomain(domains, option.name))}
                      />
                      <span>
                        {option.name.replace(/_/g, " ")}
                        <small>{option.description}</small>
                      </span>
                    </label>
                  );
                })}
            </div>
            <small id={hintId} aria-live="polite">
              {atLimit
                ? `Up to ${MAX_SEARCH_DOMAINS} search sources`
                : "All sources, Auto, or up to 3 categories"}
            </small>
          </fieldset>
        </div>
      )}
    </div>
  );
}
