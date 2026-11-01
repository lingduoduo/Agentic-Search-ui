import { useSyncExternalStore } from "react";
import { SESSION_CLEARED_EVENT } from "../config/session";
import { getCurrentUser, getPermissions } from "../services/api";
import type { CurrentUser, Permission } from "../interfaces";

export type Account = { user: CurrentUser; permissions: Permission[] };

let account: Account | null = null;
let pending: Promise<Account> | null = null;
const listeners = new Set<() => void>();

function setAccount(next: Account | null) {
  account = next;
  listeners.forEach((listener) => listener());
}

// The cookie no longer works, so neither does the account loaded with it.
window.addEventListener(SESSION_CLEARED_EVENT, () => setAccount(null));

export const getAccount = () => account;

export const clearAccount = () => setAccount(null);

/** Loads /me and /me/permissions; concurrent callers share one request. */
export function loadAccount(): Promise<Account> {
  pending ??= Promise.all([getCurrentUser(), getPermissions()])
    .then(([user, permissions]) => {
      setAccount({ user, permissions });
      return { user, permissions };
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount() {
  return useSyncExternalStore(subscribe, getAccount);
}
