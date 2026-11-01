import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { DEFAULT_ROUTE, LOGIN_PATH, isRoute } from "../../config/routes";
import {
  errorStatus,
  getAdminSummary,
  getAnalyticsByFlow,
  getAnalyticsByLLM,
  getAnalyticsByPersona,
  login,
  logout,
} from "../../services/api";
import { accountCleared, loadAccount, selectAccount } from "../../store/account";
import { store } from "../../store";
import { isLogin } from "../../utils/auth";
import type { Account } from "../../store/account";
import type { AdminSurfaceSummary, BreakdownAnalytics, Permission } from "../../interfaces";

export const ADMIN_PERMISSION: Permission = "full_admin_panel_access";

export const isAdmin = (account: Account | null | undefined) =>
  account?.permissions.includes(ADMIN_PERMISSION) ?? false;

// True while a loader confirms the session with the backend; the loader
// redirects itself then, so the session-cleared listener stands down.
let verifyingSession = false;
export const isVerifyingSession = () => verifyingSession;

/**
 * Confirms the HttpOnly cookie by loading the account, once per page load.
 * "signed-out" for 401, or 404 when the cookie names a user that no longer
 * exists (e.g. after the backend's in-memory database restarted); "error"
 * for anything else, such as the backend being down.
 */
async function verifySession(): Promise<Account | "signed-out" | "error"> {
  if (isLogin()) return selectAccount(store.getState())!;
  verifyingSession = true;
  try {
    return await store.dispatch(loadAccount());
  } catch (err) {
    const status = errorStatus(err);
    return status === 401 || status === 404 ? "signed-out" : "error";
  } finally {
    verifyingSession = false;
  }
}

/**
 * Where to go after signing in. Only app pages on this origin qualify, so a
 * crafted `?redirect=` cannot send the user off-site or back to sign-in.
 */
export function safeRedirectPath(target: string | null): string {
  if (!target?.startsWith("/")) return DEFAULT_ROUTE;
  const base = "http://app.invalid";
  const url = new URL(target, base);
  if (url.origin !== base || !isRoute(url.pathname)) {
    return DEFAULT_ROUTE;
  }
  return url.pathname + url.search + url.hash;
}

/** `/auth/login?redirect=/chat%3Fq%3D1`: slashes stay readable, the rest is encoded. */
export function loginPath(fullPath: string) {
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(fullPath).replaceAll("%2F", "/")}`;
}

function loginRedirect(request: Request) {
  const { pathname, search, hash } = new URL(request.url);
  return redirect(loginPath(pathname + search + hash));
}

export type GuardData = { error: string | null };

/**
 * The one guard, run before every navigation (Vue Router's `beforeEach`).
 * `publicRouteId` names the route when it is public: it needs no session, and
 * the sign-in page sends a signed-in visitor on. Every other route needs a
 * session; a signed-out visitor signs in and comes back.
 */
export async function guard(
  { request }: LoaderFunctionArgs,
  publicRouteId?: string,
): Promise<GuardData> {
  if (publicRouteId) {
    if (publicRouteId === "auth-login" && typeof (await verifySession()) === "object") {
      throw redirect(safeRedirectPath(new URL(request.url).searchParams.get("redirect")));
    }
    return { error: null };
  }
  const session = await verifySession();
  if (session === "signed-out") throw loginRedirect(request);
  // The backend could not answer: keep going and let the layout show the error.
  if (session === "error") {
    return { error: "Could not confirm your session with the server. Reload to try again." };
  }
  return { error: null };
}

export type AdminData = {
  summary: AdminSurfaceSummary | null;
  byLLM: BreakdownAnalytics | null;
  byPersona: BreakdownAnalytics | null;
  byFlow: BreakdownAnalytics | null;
};

/** Checks the permission before any admin request is made. */
export async function adminLoader({ request }: LoaderFunctionArgs): Promise<AdminData> {
  // Runs alongside the guard; both share the one account request.
  const session = await verifySession();
  if (session === "signed-out") throw loginRedirect(request);
  if (session === "error" || !isAdmin(session)) throw redirect(DEFAULT_ROUTE);
  // Each panel renders on its own, so one failing endpoint hides only its panel.
  const optional = <T>(promise: Promise<T>) => promise.catch(() => null);
  const [summary, byLLM, byPersona, byFlow] = await Promise.all([
    optional(getAdminSummary()),
    optional(getAnalyticsByLLM()),
    optional(getAnalyticsByPersona()),
    optional(getAnalyticsByFlow()),
  ]);
  return { summary, byLLM, byPersona, byFlow };
}

export async function loginAction({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  try {
    await login(String(form.get("email") ?? "").trim(), String(form.get("password") ?? ""));
    // Cache the account now so the guard lets the next page straight in.
    await store.dispatch(loadAccount());
  } catch (err) {
    store.dispatch(accountCleared());
    return { error: err instanceof Error ? err.message : "Unable to sign in. Please try again." };
  }
  return redirect(safeRedirectPath(new URL(request.url).searchParams.get("redirect")));
}

export async function logoutAction() {
  await logout();
  store.dispatch(accountCleared());
  return redirect(LOGIN_PATH);
}
