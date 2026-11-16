import { useLocation, useNavigate, useSearchParams } from "react-router";

export const TABLE_PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_TABLE_PAGE_SIZE = 20;

/** URL state shared by server-paginated tables; navigation preserves filters and hashes. */
export function useTablePagination() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const requestedPage = Number(params.get("current_page"));
  const requestedSize = Number(params.get("page_size"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = TABLE_PAGE_SIZES.some((size) => size === requestedSize)
    ? requestedSize
    : DEFAULT_TABLE_PAGE_SIZE;

  const goTo = (next: number, replace = false) => {
    if (!Number.isSafeInteger(next) || next < 1 || next === page) return;
    const nextParams = new URLSearchParams(params);
    if (next > 1) nextParams.set("current_page", String(next));
    else nextParams.delete("current_page");
    void navigate({ search: nextParams.toString(), hash }, { replace });
  };

  const setPageSize = (next: number) => {
    if (!TABLE_PAGE_SIZES.some((size) => size === next) || next === pageSize) return;
    const nextParams = new URLSearchParams(params);
    nextParams.delete("current_page");
    if (next === DEFAULT_TABLE_PAGE_SIZE) nextParams.delete("page_size");
    else nextParams.set("page_size", String(next));
    void navigate({ search: nextParams.toString(), hash });
  };

  return { page, pageSize, goTo, setPageSize };
}
