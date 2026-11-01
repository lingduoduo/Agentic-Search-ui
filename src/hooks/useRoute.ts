import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import type { Route } from "../config/routes";
import { canonicalPathname, normalizeRoute } from "../routes/navigation";

/** Resolve the current React Router location to a supported surface. */
export function useRoute(): Route {
  return normalizeRoute(useLocation().pathname);
}

/** Canonicalize root, unknown and trailing-slash URLs without adding history. */
export function useCanonicalRoute(): Route {
  const location = useLocation();
  const navigate = useNavigate();
  const route = normalizeRoute(location.pathname);
  const pathname = canonicalPathname(location.pathname);
  useEffect(() => {
    if (location.pathname !== pathname) {
      void navigate({ pathname, search: location.search, hash: location.hash }, { replace: true });
    }
  }, [location, navigate, pathname]);
  return route;
}
