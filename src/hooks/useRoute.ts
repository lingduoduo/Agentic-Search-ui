import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_ROUTE } from "../config/routes";
import type { Route } from "../config/routes";
import { normalizeRoute } from "../routes/navigation";

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getSnapshot(): Route {
  return normalizeRoute(window.location.pathname);
}

/** The route for the current URL, re-read whenever the history entry changes. */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_ROUTE);
}

/**
 * `useRoute`, plus an address-bar rewrite when the URL is not already the
 * resolved route (`/` and unknown paths). `replaceState` keeps Back pointing at
 * whatever preceded the app instead of looping on the redirect.
 */
export function useCanonicalRoute(): Route {
  const route = useRoute();
  useEffect(() => {
    if (window.location.pathname !== route) {
      window.history.replaceState({}, "", route);
    }
  }, [route]);
  return route;
}
