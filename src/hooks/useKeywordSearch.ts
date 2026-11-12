import { useCallback, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

const NO_RESETS: readonly string[] = [];

/**
 * Keep an editable draft and a URL keyword synchronized on submission/navigation.
 * `resets` names other URL params a new keyword clears, such as a page number.
 */
export function useKeywordSearch(resets: readonly string[] = NO_RESETS) {
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const keyword = params.get("search_word") ?? "";
  const [query, setQuery] = useState(keyword);
  const [previousKeyword, setPreviousKeyword] = useState(keyword);
  // Navigation resets the draft; typing alone does not add history entries.
  if (keyword !== previousKeyword) {
    setPreviousKeyword(keyword);
    setQuery(keyword);
  }

  const commitKeyword = useCallback(
    (value: string) => {
      const normalized = value.trim();
      setQuery(normalized);
      const nextParams = new URLSearchParams(params);
      if (normalized) nextParams.set("search_word", normalized);
      else nextParams.delete("search_word");
      if (normalized !== keyword) resets.forEach((name) => nextParams.delete(name));
      if (nextParams.toString() !== params.toString()) {
        void navigate({ search: nextParams.toString(), hash });
      }
      return normalized;
    },
    [params, navigate, hash, keyword, resets],
  );

  return { query, setQuery, commitKeyword };
}
