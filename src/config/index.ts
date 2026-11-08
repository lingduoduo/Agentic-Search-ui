// Empty means same-origin. Routes already include /api where required;
// VITE_API_BASE_URL, when set, is the backend origin without a path prefix.
export const apiPrefix = (import.meta.env.VITE_API_BASE_URL?.trim() || "").replace(/\/+$/, "");

// Business response codes, distinct from numeric HTTP status codes.
export const httpCode = {
  success: "success",
  fail: "fail",
  notFound: "not_found",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  validateError: "validate_error",
} as const;

export type HttpCode = (typeof httpCode)[keyof typeof httpCode];
