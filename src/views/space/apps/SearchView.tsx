import { SourcePicker } from "../../../components/SourcePicker";
import { useSearchDomains } from "../../../hooks/useSearchDomains";
import { useState } from "react";
import { runAgent } from "../../../services/api";
import type { SourceDocumentView, AutoDomains } from "../../../models";
import { SourceGrid } from "../../../components/SourceGrid";

export function SearchView() {
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SourceDocumentView[]>([]);
  const [domains, setDomains] = useState<string[]>(["web"]);
  const domainOptions = useSearchDomains();
  const [autoDomains, setAutoDomains] = useState<AutoDomains | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setDocs([]);
    setAutoDomains(null);
    try {
      const r = await runAgent({ query: q, mode: "search_tool", top_k: 8, domains });
      setDocs(r.documents);
      setAutoDomains(r.auto_domains ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="search-view" aria-label="Search">
      <div className="search-view__composer">
        <input
          aria-label="Search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Search your sources…"
          disabled={busy}
        />
        <button onClick={submit} disabled={busy}>
          {busy ? "…" : "Search"}
        </button>
      </div>
      <SourcePicker
        domains={domains}
        options={domainOptions}
        onChange={setDomains}
        disabled={busy}
      />
      {autoDomains && (
        <p role="status">
          {autoDomains.status === "ok"
            ? `Auto picked: ${autoDomains.selected.join(" · ")}`
            : "Auto unavailable: searched web"}
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}
      <SourceGrid documents={docs} />
    </section>
  );
}
