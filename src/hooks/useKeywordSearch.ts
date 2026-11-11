import { useCallback, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

/** Keep an editable draft and a URL keyword synchronized on submission/navigation. */
export function useKeywordSearch() {
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
      if (nextParams.toString() !== params.toString()) {
        void navigate({ search: nextParams.toString(), hash });
      }
      return normalized;
    },
    [params, navigate, hash],
  );

  return { query, setQuery, commitKeyword };
}
