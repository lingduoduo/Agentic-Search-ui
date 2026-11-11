import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Plug, Plus, Settings, Wrench, X } from "lucide-react";
import {
  deleteOpenAPIProvider,
  getOpenAPIProvider,
  getToolProviders,
  registerOpenAPITools,
  updateOpenAPIProvider,
  validateOpenAPISchema,
} from "../../../services/api";
import type { OpenAPIOperation, Paginator, ToolProviderView, ToolView } from "../../../models";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import { ToolInvokeModal } from "../../../components/ToolInvokeModal";

export const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

const SOURCE_LABELS: Record<string, string> = {
  function: "Built-in",
  openapi: "OpenAPI",
  mcp: "MCP server",
};

const countLabel = (n: number) => `${n} tool${n === 1 ? "" : "s"}`;
const titleOf = (p: ToolProviderView) => (p.source === "function" ? "Built-in tools" : p.name);

type Parameter = { name: string; type: string; description: string; required: boolean };

/** The top-level parameters a tool's JSON Schema declares. */
function parametersOf(tool: ToolView): Parameter[] {
  const schema = tool.parameters as { properties?: unknown; required?: unknown };
  const properties =
    schema.properties && typeof schema.properties === "object"
      ? (schema.properties as Record<string, { type?: unknown; description?: unknown }>)
      : {};
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    type: typeof prop?.type === "string" ? prop.type : "",
    description: typeof prop?.description === "string" ? prop.description : "",
    required: required.has(name),
  }));
}

/** Create a provider, or edit the OpenAPI provider with this id. */
type DialogMode = { kind: "create" } | { kind: "edit"; providerId: string };

/**
 * `/space/tools`: the registry grouped by provider, a page at a time, with
 * test-invoke and OpenAPI provider create, edit and delete.
 */
export function ToolsView() {
  const [providers, setProviders] = useState<ToolProviderView[]>([]);
  const [paginator, setPaginator] = useState<Paginator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [term, setTerm] = useState("");
  // The search the server filters by: the box's text once typing pauses.
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  // By id, so loading more pages never points the drawer at another card.
  const [openId, setOpenId] = useState<string | null>(null);
  const [invoking, setInvoking] = useState<ToolView | null>(null);
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const request = useRef<{ controller: AbortController; page: number } | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(term.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [term]);

  /** Page 1 replaces the list; later pages append. A newer request aborts an older one. */
  const fetchPage = useCallback((page: number, searchWord: string) => {
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { controller, page };
    setLoading(true);
    setError("");
    getToolProviders(
      { current_page: page, page_size: PAGE_SIZE, search_word: searchWord },
      { signal: controller.signal },
    )
      .then((res) => {
        setProviders((prev) => {
          if (page === 1) return res.list;
          // The registry can change between pages; never show a provider twice.
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.list.filter((p) => !seen.has(p.id))];
        });
        setPaginator(res.paginator);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load tools.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  // A new search, or a change to the registry, starts again from page 1.
  useEffect(() => {
    fetchPage(1, search);
    return () => request.current?.controller.abort();
  }, [search, reload, fetchPage]);

  const hasMore = paginator !== null && paginator.current_page < paginator.total_page;
  const loadMore = () => {
    if (!loading && hasMore) fetchPage(paginator.current_page + 1, search);
  };
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // Infinite scroll: load the next page when the end of the list comes into view.
  // The Load more button covers browsers (and tests) without IntersectionObserver.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  const open = providers.find((p) => p.id === openId);
  const refocus = () => opener.current?.focus();
  const registryChanged = () => {
    setDialog(null);
    setOpenId(null);
    setReload((n) => n + 1);
  };

  return (
    <section className="sources-catalog" aria-label="Tools">
      <div className="sources-catalog__toolbar">
        <input
          type="search"
          aria-label="Find a tool"
          placeholder="Find a tool…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        <button
          type="button"
          className="btn-primary btn-sm tools-catalog__create"
          aria-haspopup="dialog"
          onClick={(event) => {
            opener.current = event.currentTarget;
            setDialog({ kind: "create" });
          }}
        >
          <Plus aria-hidden="true" size={16} />
          Create tool
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="account-retry"
            aria-label="Retry loading tools"
            onClick={() => fetchPage(request.current?.page ?? 1, search)}
          >
            Retry
          </button>
        </div>
      )}

      <ul className="sources-catalog__grid">
        {providers.map((provider) => (
          <li key={provider.id}>
            <button
              type="button"
              className="source-card"
              aria-haspopup="dialog"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setOpenId(provider.id);
              }}
            >
              <ProviderHeading provider={provider} />
              <span className="source-card__description">
                {provider.description || provider.tools.map((t) => t.name).join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div ref={sentinel} className="tools-catalog__more">
        {loading ? (
          <p role="status">Loading tools…</p>
        ) : hasMore ? (
          <button type="button" className="btn-ghost btn-sm" onClick={loadMore}>
            Load more
          </button>
        ) : (
          !error &&
          (providers.length === 0 ? (
            <p className="sources-catalog__empty">
              {search ? "No tools match." : "No tools registered."}
            </p>
          ) : (
            <p>All tools loaded</p>
          ))
        )}
      </div>

      {open && (
        <ProviderDrawer
          provider={open}
          onClose={() => {
            setOpenId(null);
            refocus();
          }}
          onInvoke={(tool) => {
            setOpenId(null);
            setInvoking(tool);
          }}
          onEdit={() => setDialog({ kind: "edit", providerId: open.id })}
        />
      )}

      {invoking && (
        <ToolInvokeModal
          tool={invoking}
          onClose={() => {
            setInvoking(null);
            refocus();
          }}
        />
      )}

      {dialog && (
        <ToolDialog
          mode={dialog}
          onClose={() => {
            setDialog(null);
            refocus();
          }}
          onSaved={registryChanged}
        />
      )}
    </section>
  );
}

/** Icon tile, title and the "source · N tools" line, shared by card and drawer. */
function ProviderHeading({ provider, titleId }: { provider: ToolProviderView; titleId?: string }) {
  const Icon = provider.source === "function" ? Wrench : Plug;
  return (
    <span className="source-card__heading">
      <span className="source-option__icon source-card__icon tools-catalog__icon">
        <Icon aria-hidden="true" size={20} />
      </span>
      <span>
        <strong id={titleId} className="source-option__name">
          {titleOf(provider)}
        </strong>
        <small>
          {SOURCE_LABELS[provider.source] ?? provider.source} · {countLabel(provider.tools.length)}
        </small>
      </span>
    </span>
  );
}

function ProviderDrawer({
  provider,
  onClose,
  onInvoke,
  onEdit,
}: {
  provider: ToolProviderView;
  onClose: () => void;
  onInvoke: (tool: ToolView) => void;
  onEdit: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  // Focus moves in once, on open; the page refocuses the card on close.
  useEffect(() => close.current?.focus(), []);
  useFocusTrap(panel, onClose);

  return (
    <div className="source-drawer__backdrop" onClick={onClose}>
      <aside
        ref={panel}
        className="source-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="source-drawer__top">
          <ProviderHeading provider={provider} titleId={titleId} />
          <button ref={close} type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        {provider.description && <p>{provider.description}</p>}
        {/* MCP servers come from config, so only OpenAPI providers can be edited or deleted. */}
        {provider.source === "openapi" && (
          <button type="button" className="btn-ghost btn-sm tools-catalog__edit" onClick={onEdit}>
            <Settings aria-hidden="true" size={14} />
            Edit tool
          </button>
        )}

        <h3>Includes {countLabel(provider.tools.length)}</h3>
        <ul className="tools-catalog__tools">
          {provider.tools.map((tool) => {
            const parameters = parametersOf(tool);
            return (
              <li key={tool.name}>
                <div className="tools-catalog__tool-top">
                  <strong>{tool.name}</strong>
                  <button
                    type="button"
                    className="btn-run btn-sm"
                    aria-label={`Test ${tool.name}`}
                    onClick={() => onInvoke(tool)}
                  >
                    ▶ Test
                  </button>
                </div>
                <p>{tool.description || "No description."}</p>
                {parameters.length > 0 && (
                  <dl>
                    {parameters.map((p) => (
                      <div key={p.name}>
                        <dt>
                          <strong>{p.name}</strong>
                          {p.type && <span>{p.type}</span>}
                          {p.required && <span className="tools-catalog__required">Required</span>}
                        </dt>
                        {p.description && <dd>{p.description}</dd>}
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

type HeaderRow = { key: string; value: string };

const errorText = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

/** Create an OpenAPI provider, or edit (and delete) an existing one. */
function ToolDialog({
  mode,
  onClose,
  onSaved,
}: {
  mode: DialogMode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = mode.kind === "edit" ? mode.providerId : null;
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [schema, setSchema] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [operations, setOperations] = useState<OpenAPIOperation[]>([]);
  const [schemaError, setSchemaError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(editing !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Only the latest validation may update the table; an older answer is dropped.
  const validation = useRef(0);
  useFocusTrap(panel, onClose);

  const validateSchema = useCallback(async (text: string) => {
    const run = ++validation.current;
    if (!text.trim()) {
      setOperations([]);
      setSchemaError("");
      return;
    }
    try {
      const res = await validateOpenAPISchema(text);
      if (run !== validation.current) return;
      setOperations(res.tools);
      setSchemaError("");
    } catch (cause) {
      if (run !== validation.current) return;
      setOperations([]);
      setSchemaError(errorText(cause, "The schema is not valid."));
    }
  }, []);

  // Editing starts from the provider's stored configuration.
  useEffect(() => {
    if (editing === null) return;
    const controller = new AbortController();
    getOpenAPIProvider(editing, { signal: controller.signal })
      .then((detail) => {
        setName(detail.name);
        setSchema(detail.openapi_json);
        setHeaders(Object.entries(detail.headers).map(([key, value]) => ({ key, value })));
        void validateSchema(detail.openapi_json);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorText(cause, "Unable to load this tool."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetail(false);
      });
    return () => controller.abort();
  }, [editing, validateSchema]);

  const setHeader = (index: number, patch: Partial<HeaderRow>) =>
    setHeaders((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("The tool name is required.");
    if (!schema.trim()) return setError("The OpenAPI schema is required.");
    const req = {
      name: name.trim(),
      openapi_json: schema.trim(),
      headers: Object.fromEntries(
        headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value]),
      ),
    };
    setSaving(true);
    try {
      const res =
        editing === null
          ? await registerOpenAPITools(req)
          : await updateOpenAPIProvider(editing, req);
      if (res.tool_names.length === 0) {
        setError("No tools were registered from this schema.");
        return;
      }
      onSaved();
    } catch (cause) {
      setError(errorText(cause, "Saving failed."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (editing === null) return;
    if (
      !window.confirm(
        "Delete this tool? This cannot be undone, and agents will no longer be able to call it.",
      )
    )
      return;
    try {
      await deleteOpenAPIProvider(editing);
      onSaved();
    } catch (cause) {
      setError(errorText(cause, "Delete failed."));
    }
  }

  const title = editing === null ? "Create tool" : "Edit tool";
  return (
    <div className="tool-modal-overlay" onClick={onClose}>
      <div
        ref={panel}
        className="tool-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tool-modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-ghost btn-sm" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {loadingDetail ? (
          <p role="status">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="tool-dialog-name">Tool name</label>
              <input
                id="tool-dialog-name"
                type="text"
                maxLength={60}
                autoFocus
                placeholder="A name that makes its purpose clear"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="tool-field">
              <label htmlFor="tool-dialog-schema">OpenAPI schema</label>
              <textarea
                id="tool-dialog-schema"
                rows={6}
                spellCheck={false}
                placeholder={'{"openapi":"3.0.0","info":{"title":"..."},"paths":{...}}'}
                value={schema}
                onChange={(event) => setSchema(event.target.value)}
                onBlur={() => void validateSchema(schema)}
              />
              {schemaError && <p className="form-error">{schemaError}</p>}
            </div>

            <div className="tool-field">
              <span className="tool-field-label">Available tools</span>
              <table className="tool-table" aria-label="Available tools">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Method</th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op) => (
                    <tr key={op.name} className="tool-row">
                      <td>{op.name}</td>
                      <td>{op.description}</td>
                      <td>{op.method}</td>
                      <td>{op.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tool-field">
              <span className="tool-field-label">Headers</span>
              <table className="tool-table" aria-label="Headers">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, index) => (
                    <tr key={index} className="tool-row">
                      <td>
                        <input
                          type="text"
                          aria-label={`Header ${index + 1} key`}
                          placeholder="Authorization"
                          value={header.key}
                          onChange={(event) => setHeader(index, { key: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`Header ${index + 1} value`}
                          placeholder="Bearer sk-…"
                          value={header.value}
                          onChange={(event) => setHeader(index, { value: event.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          aria-label={`Remove header ${index + 1}`}
                          onClick={() => setHeaders((rows) => rows.filter((_, i) => i !== index))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setHeaders((rows) => [...rows, { key: "", value: "" }])}
              >
                + Add header
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              {editing !== null && (
                <button
                  type="button"
                  className="btn-ghost btn-danger tools-catalog__delete"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
