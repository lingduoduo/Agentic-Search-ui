import { Search } from "lucide-react";
import { useKeywordSearch } from "../hooks/useKeywordSearch";

/** Submit and clear a server keyword search while keeping its draft in sync with navigation. */
export function KeywordSearch({
  label,
  placeholder,
  resets,
  className = "",
}: {
  label: string;
  placeholder: string;
  resets?: readonly string[];
  className?: string;
}) {
  const { keyword, query, setQuery, commitKeyword } = useKeywordSearch(resets);
  return (
    <form
      role="search"
      aria-label={label}
      className={`keyword-search ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        commitKeyword(query);
      }}
    >
      <span className="keyword-search__field">
        <Search aria-hidden="true" size={16} />
        <input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </span>
      <button type="submit" className="btn-ghost btn-sm">
        Search
      </button>
      {(query || keyword) && (
        <button
          type="button"
          className="btn-ghost btn-sm"
          aria-label="Clear search"
          onClick={() => commitKeyword("")}
        >
          Clear
        </button>
      )}
    </form>
  );
}
