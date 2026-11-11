import { SourcePicker } from "../../../components/SourcePicker";
import { AutoDomainsNote } from "../../../components/DomainChips";
import { useSearchDomains } from "../../../hooks/useSearchDomains";
import { useKeywordSearch } from "../../../hooks/useKeywordSearch";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { runAgent } from "../../../services/api";
import type { SourceDocumentView, AutoDomains } from "../../../models";
import { SourceGrid } from "../../../components/SourceGrid";

export function SearchView() {
  const [docs, setDocs] = useState<SourceDocumentView[]>([]);
  // `?domain=academic` (the Sources page's "Search with this") preselects a category.
  const [params] = useSearchParams();
  const { query, setQuery, commitKeyword } = useKeywordSearch();
  const [domains, setDomains] = useState<string[]>(() => {
    const domain = params.get("domain");
    return domain ? [domain] : ["web"];
  });
  const domainOptions = useSearchDomains();
  const [autoDomains, setAutoDomains] = useState<AutoDomains | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    const q = commitKeyword(query);
    if (!q) return;
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
      {autoDomains && <AutoDomainsNote autoDomains={autoDomains} />}
      {error && <div className="error-banner">{error}</div>}
      <SourceGrid documents={docs} />
    </section>
  );
}
