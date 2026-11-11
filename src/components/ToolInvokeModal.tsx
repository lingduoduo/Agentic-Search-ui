import { useMemo, useState } from "react";
import { invokeTool } from "../services/api";
import type { ToolInvokeResponse, ToolView } from "../models";
import { buildArguments, initialValues, toolFormFromSchema, validate } from "../utils/toolSchema";
import type { ToolField } from "../utils/toolSchema";

interface InvokeModalProps {
  tool: ToolView;
  onClose: () => void;
}

/** One schema-derived control. */
function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: ToolField;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const id = `tool-field-${field.name}`;
  const described = field.description ? `${id}-desc` : undefined;

  const control = () => {
    switch (field.kind) {
      case "boolean":
        return (
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
      case "enum":
        return (
          <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            <option value="">Choose…</option>
            {field.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "text":
        return (
          <textarea
            id={id}
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
      case "integer":
        return (
          <input
            id={id}
            type="number"
            step={field.kind === "integer" ? 1 : "any"}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "stringList": {
        // A list of plain strings: one box per entry, because typing JSON
        // brackets is exactly the chore this dialog existed to impose.
        const items = Array.isArray(value) ? (value as string[]) : [""];
        return (
          <div className="tool-field-list">
            {items.map((item, i) => (
              <div className="tool-field-list-row" key={i}>
                <input
                  id={i === 0 ? id : undefined}
                  aria-label={i === 0 ? undefined : `${field.label} ${i + 1}`}
                  value={item}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = e.target.value;
                    onChange(next);
                  }}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    aria-label={`Remove ${field.label} ${i + 1}`}
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => onChange([...items, ""])}
            >
              + Add another
            </button>
          </div>
        );
      }
      default:
        return (
          <input
            id={id}
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="tool-field" aria-describedby={described}>
      <label htmlFor={id}>
        {field.label}
        {field.required && (
          <span className="tool-field-required" aria-label="required">
            {" *"}
          </span>
        )}
      </label>
      {field.description && (
        <p className="tool-field-desc" id={described}>
          {field.description}
        </p>
      )}
      {control()}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

/** Test-invoke one tool: a form built from its JSON Schema, or raw JSON. */
export function ToolInvokeModal({ tool, onClose }: InvokeModalProps) {
  const form = useMemo(() => toolFormFromSchema(tool.parameters), [tool.parameters]);
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(form.fields));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Schemas a flat form cannot express start in JSON mode and stay there.
  const [jsonMode, setJsonMode] = useState(!form.supported);
  const [argsJson, setArgsJson] = useState("{}");
  const [result, setResult] = useState<ToolInvokeResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  async function handleInvoke(e: React.FormEvent) {
    e.preventDefault();
    setJsonError(null);
    setFieldErrors({});

    let args: Record<string, unknown>;
    if (jsonMode) {
      try {
        args = JSON.parse(argsJson);
      } catch {
        setJsonError("Invalid JSON.");
        return;
      }
    } else {
      const errors = validate(form.fields, values);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      args = buildArguments(form.fields, values);
    }

    setRunning(true);
    try {
      const res = await invokeTool(tool.name, { arguments: args });
      setResult(res);
    } catch (err) {
      setResult({
        response: "",
        raw: null,
        errors: [err instanceof Error ? err.message : "Invocation failed."],
      });
    } finally {
      setRunning(false);
    }
  }

  /** Switching to JSON carries the form's values over, so nothing is retyped. */
  function toggleJsonMode() {
    if (!jsonMode) {
      setArgsJson(JSON.stringify(buildArguments(form.fields, values), null, 2));
    }
    setJsonMode((v) => !v);
    setJsonError(null);
    setFieldErrors({});
  }

  return (
    <div className="tool-modal-overlay" onClick={onClose}>
      <div
        className="tool-modal"
        role="dialog"
        aria-label={`Invoke ${tool.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tool-modal-header">
          <h3>Invoke: {tool.name}</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="tool-modal-desc">{tool.description || "No description."}</p>
        <form onSubmit={handleInvoke}>
          {jsonMode ? (
            <>
              {!form.supported && (
                <p className="tool-modal-hint">
                  This tool takes nested arguments, so it is edited as JSON.
                </p>
              )}
              <label htmlFor="tool-args-json">Arguments (JSON)</label>
              <textarea
                id="tool-args-json"
                className="tool-args-input"
                value={argsJson}
                onChange={(e) => setArgsJson(e.target.value)}
                rows={6}
                spellCheck={false}
              />
            </>
          ) : form.fields.length === 0 ? (
            <p className="tool-modal-hint">This tool takes no arguments.</p>
          ) : (
            form.fields.map((f) => (
              <FieldControl
                key={f.name}
                field={f}
                value={values[f.name]}
                error={fieldErrors[f.name]}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
              />
            ))
          )}
          {jsonError && <p className="form-error">{jsonError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={running}>
              {running ? "Running…" : "▶ Invoke"}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {form.supported && form.fields.length > 0 && (
              <button type="button" className="btn-ghost btn-sm" onClick={toggleJsonMode}>
                {jsonMode ? "Use the form" : "Edit as JSON"}
              </button>
            )}
          </div>
        </form>
        {result && (
          <div className="tool-result">
            {result.errors.length > 0 ? (
              <div className="tool-result-errors">
                {result.errors.map((e, i) => (
                  <p key={i} className="form-error">
                    {e}
                  </p>
                ))}
              </div>
            ) : (
              <pre className="tool-result-pre">{result.response}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
