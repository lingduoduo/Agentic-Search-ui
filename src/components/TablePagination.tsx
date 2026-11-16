import type { Paginator } from "../models";
import { TABLE_PAGE_SIZES } from "../hooks/useTablePagination";

/** Bounded page buttons and page size controls for a server-paginated table. */
export function TablePagination({
  paginator,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
}: {
  paginator: Paginator;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, paginator.total_page);
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);

  return (
    <nav className="qh-pagination table-pagination" aria-label="Document pages">
      <span>{paginator.total_record.toLocaleString()} documents</span>
      <button type="button" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>
        ‹ Prev
      </button>
      {start > 1 && (
        <>
          <button
            type="button"
            disabled={loading}
            aria-label="Go to page 1"
            onClick={() => onPageChange(1)}
          >
            1
          </button>
          <span aria-hidden="true">…</span>
        </>
      )}
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`Go to page ${number}`}
          aria-current={number === page ? "page" : undefined}
          disabled={loading || number === page}
          onClick={() => onPageChange(number)}
        >
          {number}
        </button>
      ))}
      {pages.at(-1)! < totalPages && (
        <>
          <span aria-hidden="true">…</span>
          <button
            type="button"
            disabled={loading}
            aria-label={`Go to page ${totalPages}`}
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        type="button"
        disabled={loading || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next ›
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <label>
        Documents per page{" "}
        <select
          aria-label="Documents per page"
          value={pageSize}
          disabled={loading}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {TABLE_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
