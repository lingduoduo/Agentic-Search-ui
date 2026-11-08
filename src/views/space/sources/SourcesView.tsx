import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { fetchSearchDomains } from "../../../services/api";
import type { SearchDomainFamily, SearchDomainOption } from "../../../models";
import {
  SOURCE_CATEGORIES,
  domainLabel,
  domainStyle,
  familyOf,
} from "../../../config/sourceCategories";

// "web" and "auto" are search modes, not categories, so the catalog leaves them out.
const isCategory = (option: SearchDomainOption) => option.name !== "web" && option.name !== "auto";

// "get_stock_quote" -> "stock quote", "search_arxiv" -> "arxiv".
const toolLabel = (tool: string) => tool.replace(/^(get|search)_/, "").replace(/_/g, " ");

/** `/space/sources`: every search category by family, each with its sites and tools. */
export function SourcesView() {
  const [domains, setDomains] = useState<SearchDomainOption[]>([]);
  // The API's families (names and order); the local table until it answers.
  const [families, setFamilies] = useState<SearchDomainFamily[]>(SOURCE_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [family, setFamily] = useState("all");
  const [term, setTerm] = useState("");
  // The open category by name, so filtering never points the drawer at another card.
  const [openName, setOpenName] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  // A retry, or leaving the page, aborts the request in flight.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchSearchDomains(controller.signal)
      .then((body) => {
        setDomains(body.domains.filter(isCategory));
        if (body.categories?.length) setFamilies(body.categories);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load search sources.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const query = term.trim().toLowerCase();
  const shown = domains.filter(
    (d) =>
      (family === "all" || d.category === family) &&
      (query === "" || `${domainLabel(d.name)} ${d.description}`.toLowerCase().includes(query)),
  );
  const familyName = (key: string | undefined) =>
    families.find((f) => f.category === key)?.name ?? familyOf(key).name;
  const open = domains.find((d) => d.name === openName);

  return (
    <section className="sources-catalog" aria-label="Search sources">
      <div className="sources-catalog__toolbar">
        <div className="source-picker__tabs" role="group" aria-label="Source families">
          {[{ category: "all", name: "All" }, ...families].map((f) => (
            <button
              key={f.category}
              type="button"
              aria-pressed={family === f.category}
              onClick={() => setFamily(f.category)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Find a source"
          placeholder="Find a source…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="account-retry"
            aria-label="Retry loading search sources"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {loading && <p role="status">Loading search sources…</p>}

      <ul className="sources-catalog__grid">
        {shown.map((domain) => (
          <li key={domain.name}>
            <button
              type="button"
              className="source-card"
              aria-haspopup="dialog"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpenName(domain.name);
              }}
            >
              <SourceHeading domain={domain} familyName={familyName(domain.category)} />
              <span className="source-card__description">{domain.description}</span>
              {!!domain.typical_sources?.length && (
                <span className="source-card__typical">{domain.typical_sources.join(" · ")}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {!loading && !error && shown.length === 0 && (
        <p className="sources-catalog__empty">No search sources match.</p>
      )}

      {open && (
        <SourceDrawer
          domain={open}
          familyName={familyName(open.category)}
          onClose={() => {
            setOpenName(null);
            opener.current?.focus();
          }}
        />
      )}
    </section>
  );
}

/** Icon tile, name and the "family · sites · tools" line, shared by card and drawer. */
function SourceHeading({
  domain,
  familyName,
  titleId,
}: {
  domain: SearchDomainOption;
  familyName: string;
  titleId?: string;
}) {
  const { label, icon: Icon } = domainStyle(domain.name);
  const sites = domain.source_sites?.length ?? 0;
  const tools = domain.tools?.length ?? 0;
  return (
    <span className="source-card__heading">
      <span
        className="source-option__icon source-card__icon"
        style={{ background: familyOf(domain.category).background }}
      >
        <Icon aria-hidden="true" size={20} />
      </span>
      <span>
        <strong id={titleId} className="source-option__name">
          {label}
        </strong>
        <small>
          {[
            familyName,
            sites ? `${sites} site${sites > 1 ? "s" : ""}` : "Open web",
            tools ? `${tools} tool${tools > 1 ? "s" : ""}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </span>
    </span>
  );
}

function SourceDrawer({
  domain,
  familyName,
  onClose,
}: {
  domain: SearchDomainOption;
  familyName: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const close = useRef<HTMLButtonElement>(null);

  // Focus moves in once, on open; the page refocuses the card on close.
  useEffect(() => close.current?.focus(), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="source-drawer__backdrop" onClick={onClose}>
      <aside
        className="source-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="source-drawer__top">
          <SourceHeading domain={domain} familyName={familyName} titleId={titleId} />
          <button ref={close} type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <p>{domain.description}</p>

        <h3>Sites searched first</h3>
        {domain.source_sites?.length ? (
          <ul className="source-drawer__sites">
            {domain.source_sites.map((site) => (
              <li key={site}>
                <a href={`https://${site}`} target="_blank" rel="noreferrer">
                  {site}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="source-drawer__note">
            No site list: this category searches the open web with a topic hint.
          </p>
        )}

        {!!domain.typical_sources?.length && (
          <>
            <h3>Typical sources</h3>
            <p className="source-drawer__note">{domain.typical_sources.join(" · ")}</p>
          </>
        )}

        {!!domain.tools?.length && (
          <>
            <h3>Built-in tools</h3>
            <ul className="source-drawer__tools">
              {domain.tools.map((tool) => (
                <li key={tool} className="source-option__name">
                  {toolLabel(tool)}
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
