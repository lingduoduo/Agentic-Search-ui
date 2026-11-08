/** Shared envelope for endpoints that return a status, message, and payload.
 * Existing endpoints with unwrapped responses keep their domain-specific types.
 */
export type BaseResponse<T> = {
  /** Application status code, such as "success" or "fail". */
  code: string;
  message: string;
  data: T;
};

/** Shared envelope for endpoints that return a paginated list. */
export type BasePaginatorResponse<T> = BaseResponse<{
  list: T[];
  paginator: {
    total_page: number;
    total_record: number;
    current_page: number;
    page_size: number;
  };
}>;
