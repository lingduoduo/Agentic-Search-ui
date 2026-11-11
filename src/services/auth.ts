import type { CurrentUser, Permission } from "../models";
import { get, post, type RequestOptions } from "../utils/request";

/** The backend's login form sets the HttpOnly session cookie on success. */
export function login(
  email: string,
  password: string,
  init?: RequestOptions,
): Promise<CurrentUser> {
  return post<CurrentUser>("/auth/login", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
    signal: init?.signal,
  });
}

/** Clears the session cookie; succeeds even when the session has expired. */
export function logout(init?: RequestOptions): Promise<void> {
  return post<void>("/auth/logout", { signal: init?.signal });
}

export function getCurrentUser(init?: RequestOptions): Promise<CurrentUser> {
  return get<CurrentUser>("/me", { signal: init?.signal });
}

export function getPermissions(init?: RequestOptions): Promise<Permission[]> {
  return get<Permission[]>("/me/permissions", { signal: init?.signal });
}
