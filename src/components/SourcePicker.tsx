import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SearchDomainOption } from "../models";
import { AUTO, MAX_SEARCH_DOMAINS, toggleDomain } from "../utils/domains";
import { domainLabel, domainStyle, groupByCategory } from "../config/sourceCategories";
import { DomainChip } from "./DomainChips";

interface SourcePickerProps {
  domains: string[];
  options: SearchDomainOption[];
  onChange: (domains: string[]) => void;
  disabled?: boolean;
}

export function SourcePicker({ domains, options, onChange, disabled = false }: SourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  // The family tab shown; null is every family.
  const [tab, setTab] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const hintId = `${id}-hint`;
  const selected = domains.filter((d) => d !== "web" && d !== AUTO);
  const atLimit = selected.length >= MAX_SEARCH_DOMAINS;
  const label =
    domains.includes("web") || !domains.length
      ? "All sources"
      : domains.includes(AUTO)
        ? "Auto"
        : `${domainLabel(domains[0])}${domains.length > 1 ? ` + ${domains.length - 1}` : ""}`;

  const groups = groupByCategory(options.filter((o) => o.name !== "web" && o.name !== AUTO));
  const query = filter.toLowerCase();
  const shown = groups
    .filter((group) => tab === null || group.category === tab)
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        `${domainLabel(option.name)} ${option.description}`.toLowerCase().includes(query),
      ),
    }))
    .filter((group) => group.options.length > 0);

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
      <div className="source-picker__bar">
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
            setTab(null);
          }}
        >
          <span>Sources: {label}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        {selected.length > 0 && (
          <div className="domain-chips" aria-label="Selected sources">
            {selected.map((name) => (
              <DomainChip
                key={name}
                name={name}
                onRemove={disabled ? undefined : () => onChange(toggleDomain(domains, name))}
              />
            ))}
          </div>
        )}
      </div>
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
          <div className="source-picker__tabs" role="group" aria-label="Source families">
            {[{ category: null, name: "All" }, ...groups].map((group) => (
              <button
                key={group.category ?? "all"}
                type="button"
                aria-pressed={tab === group.category}
                onClick={() => setTab(group.category)}
              >
                {group.name}
              </button>
            ))}
          </div>
          <fieldset className="search-sources">
            <legend>Search source</legend>
            <div className="source-picker__presets">
              {[
                {
                  name: "web",
                  title: "Search without a category restriction",
                  checked: domains.includes("web") || !domains.length,
                  pick: () => onChange(["web"]),
                },
                {
                  name: AUTO,
                  title: "Pick up to three categories automatically",
                  checked: domains.includes(AUTO),
                  pick: () => onChange(toggleDomain(domains, AUTO)),
                },
              ].map(({ name, title, checked, pick }) => {
                const { label: text, icon: Icon, background } = domainStyle(name);
                return (
                  <label key={name} className="source-option" title={title}>
                    <input type="checkbox" checked={checked} onChange={pick} />
                    <span className="source-option__icon" style={{ background }}>
                      <Icon aria-hidden="true" size={16} />
                    </span>
                    {text}
                  </label>
                );
              })}
            </div>
            <div className="source-picker__options">
              {shown.map(({ category, name, icon: GroupIcon, options: groupOptions }) => (
                <section key={category} className="source-group" aria-label={name}>
                  <h4>
                    <GroupIcon aria-hidden="true" size={14} />
                    {name}
                  </h4>
                  {groupOptions.map((option) => {
                    const checked = domains.includes(option.name);
                    const blocked = !checked && atLimit;
                    const { label: text, icon: Icon, background } = domainStyle(option.name);
                    return (
                      <label
                        key={option.name}
                        className="source-option"
                        title={[option.description, option.typical_sources?.join(", ")]
                          .filter(Boolean)
                          .join(" — ")}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={blocked}
                          aria-label={text}
                          aria-describedby={blocked ? hintId : undefined}
                          onChange={() => onChange(toggleDomain(domains, option.name))}
                        />
                        <span className="source-option__icon" style={{ background }}>
                          <Icon aria-hidden="true" size={16} />
                        </span>
                        <span>
                          <span className="source-option__name">{text}</span>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    );
                  })}
                </section>
              ))}
              {shown.length === 0 && <p className="source-picker__empty">No matching sources</p>}
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
