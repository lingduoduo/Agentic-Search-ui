import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plug, Plus, Trash2, Wrench, X } from "lucide-react";
import { deleteOpenAPIProvider, listTools, registerOpenAPITools } from "../../../services/api";
import type { ToolView } from "../../../models";
import { groupToolsByServer } from "../../../utils/toolCatalog";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import { ToolInvokeModal } from "../../../components/ToolInvokeModal";

/** Tools that came from one place: the built-ins, one OpenAPI provider, or one MCP server. */
type Provider = {
  /** The tools' shared `provider_id` (OpenAPI provider id or MCP server name), or "local". */
  id: string;
  title: string;
  source: string;
  /**
   * Only OpenAPI providers: DELETE /admin/tools/openapi/{id} takes an OpenAPI
   * provider id. MCP tools come from server config and have no such id.
   */
  deletable: boolean;
  tools: ToolView[];
};

const SOURCE_LABELS: Record<string, string> = {
  function: "Built-in",
  openapi: "OpenAPI",
  mcp: "MCP server",
};

/** Group the registry by provider: `catalog_from_registry` in the backend's semantic_router.py. */
function groupProviders(tools: ToolView[]): Provider[] {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  return groupToolsByServer(tools).map((server) => {
    const members = server.tools.map((tool) => byName.get(tool.name)!);
    const source = members[0].source;
    const local = server.name === "local";
    // An OpenAPI provider_id is a UUID, so prefer provider_name; a short id
    // only covers a backend that predates provider_name.
    const title = local
      ? "Built-in tools"
      : (members[0].provider_name ??
        (source === "openapi" ? `OpenAPI provider ${server.name.slice(0, 8)}` : server.name));
    return {
      id: server.name,
      title,
      source,
      deletable: !local && source === "openapi",
      tools: members,
    };
  });
}

const countLabel = (n: number) => `${n} tool${n === 1 ? "" : "s"}`;

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

/** `/space/tools`: the registered tools grouped by provider, with test-invoke and OpenAPI registration. */
export function ToolsView() {
  const [tools, setTools] = useState<ToolView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [term, setTerm] = useState("");
  // By id, so a reload or filter never points the drawer at another card.
  const [openId, setOpenId] = useState<string | null>(null);
  const [invoking, setInvoking] = useState<ToolView | null>(null);
  const [creating, setCreating] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);

  // A reload, or leaving the page, aborts the request in flight.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listTools({ signal: controller.signal })
      .then(setTools)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load tools.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const providers = useMemo(() => groupProviders(tools), [tools]);
  const query = term.trim().toLowerCase();
  const shown = providers.filter(
    (p) =>
      query === "" ||
      [p.title, ...p.tools.flatMap((t) => [t.name, t.description])]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
  const open = providers.find((p) => p.id === openId);
  const refocus = () => opener.current?.focus();

  const handleDelete = async (provider: Provider) => {
    if (
      !window.confirm(
        "Delete this tool? This cannot be undone, and agents will no longer be able to call it.",
      )
    )
      return;
    try {
      await deleteOpenAPIProvider(provider.id);
      setOpenId(null);
      setTools((prev) => prev.filter((t) => t.provider_id !== provider.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed.");
    }
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
            setCreating(true);
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
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {loading && <p role="status">Loading tools…</p>}

      <ul className="sources-catalog__grid">
        {shown.map((provider) => (
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
                {provider.tools.map((t) => t.name).join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!loading && !error && shown.length === 0 && (
        <p className="sources-catalog__empty">
          {providers.length === 0 ? "No tools registered." : "No tools match."}
        </p>
      )}

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
          onDelete={() => void handleDelete(open)}
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

      {creating && (
        <CreateToolDialog
          onClose={() => {
            setCreating(false);
            refocus();
          }}
          onCreated={() => {
            setCreating(false);
            setAttempt((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}

/** Icon tile, title and the "source · N tools" line, shared by card and drawer. */
function ProviderHeading({ provider, titleId }: { provider: Provider; titleId?: string }) {
  const Icon = provider.source === "function" ? Wrench : Plug;
  return (
    <span className="source-card__heading">
      <span className="source-option__icon source-card__icon tools-catalog__icon">
        <Icon aria-hidden="true" size={20} />
      </span>
      <span>
        <strong id={titleId} className="source-option__name">
          {provider.title}
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
  onDelete,
}: {
  provider: Provider;
  onClose: () => void;
  onInvoke: (tool: ToolView) => void;
  onDelete: () => void;
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
        {provider.deletable && (
          <button type="button" className="btn-ghost btn-sm btn-danger" onClick={onDelete}>
            <Trash2 aria-hidden="true" size={14} />
            Delete tool
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

const HTTP_METHODS = new Set(["get", "head", "options", "post", "put", "patch", "delete"]);
const sanitizeName = (value: string) =>
  value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "api_tool";

type Operation = { name: string; description: string; method: string; path: string };

/**
 * The tools an OpenAPI schema will register, mirroring `_build_tool_specs` in the
 * backend's src/internal/tools/api.py, so the preview matches what Save creates.
 */
export function previewOperations(schema: string): Operation[] | null {
  let data: unknown;
  try {
    data = JSON.parse(schema);
  } catch {
    return null;
  }
  const paths = (data as { paths?: unknown } | null)?.paths;
  if (!paths || typeof paths !== "object") return [];
  const operations: Operation[] = [];
  for (const [path, item] of Object.entries(paths as Record<string, unknown>)) {
    if (!item || typeof item !== "object") continue;
    for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
      const m = method.toLowerCase();
      if (!HTTP_METHODS.has(m) || !op || typeof op !== "object") continue;
      const { operationId, description, summary } = op as Record<string, unknown>;
      operations.push({
        name: sanitizeName(
          operationId ? String(operationId) : `${m}_${path.replace(/^\/+|\/+$/g, "") || "root"}`,
        ),
        description: String(description || summary || `${m.toUpperCase()} ${path}`),
        method: m.toUpperCase(),
        path,
      });
    }
  }
  return operations;
}

type HeaderRow = { key: string; value: string };

function CreateToolDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [schema, setSchema] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const operations = useMemo(() => (schema.trim() ? previewOperations(schema) : []), [schema]);
  useFocusTrap(panel, onClose);

  const setHeader = (index: number, patch: Partial<HeaderRow>) =>
    setHeaders((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("The tool name is required.");
    if (!schema.trim()) return setError("The OpenAPI schema is required.");
    setSaving(true);
    try {
      const res = await registerOpenAPITools({
        name: name.trim(),
        openapi_json: schema.trim(),
        headers: Object.fromEntries(
          headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value]),
        ),
      });
      if (res.tool_names.length === 0) {
        setError("No tools were registered from this schema.");
        return;
      }
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration failed.");
    } finally {
      setSaving(false);
    }
  }

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
          <h3 id={titleId}>Create tool</h3>
          <button type="button" className="btn-ghost btn-sm" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="tool-field">
            <label htmlFor="create-tool-name">Tool name</label>
            <input
              id="create-tool-name"
              type="text"
              maxLength={60}
              autoFocus
              placeholder="A name that makes its purpose clear"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="tool-field">
            <label htmlFor="create-tool-schema">OpenAPI schema</label>
            <textarea
              id="create-tool-schema"
              rows={6}
              spellCheck={false}
              placeholder={'{"openapi":"3.0.0","info":{"title":"..."},"paths":{...}}'}
              value={schema}
              onChange={(event) => setSchema(event.target.value)}
            />
            {operations === null && <p className="form-error">The schema is not valid JSON.</p>}
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
                {operations?.map((op) => (
                  <tr key={`${op.method} ${op.path}`} className="tool-row">
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
          </div>
        </form>
      </div>
    </div>
  );
}
