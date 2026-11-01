import { useEffect, useState } from "react";
import { Outlet, useLocation, useMatches, useNavigate, useRouteLoaderData } from "react-router";
import { QueryHistoryPanel } from "../../components/QueryHistoryPanel";
import { ToolAdminPanel } from "../../components/ToolAdminPanel";
import type { RouteHandle } from "../../config/routes";
import { AppSidebar } from "../../components/AppSidebar";
import { isAdmin, isVerifyingSession, loginPath } from "../auth/session";
import type { GuardData } from "../auth/session";
import { SESSION_CLEARED_EVENT } from "../../config/session";
import { selectAccount } from "../../store/account";
import { useAppSelector } from "../../store";

/** Left sidebar plus the page heading; the page renders in the Outlet. */
export function DefaultLayout() {
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const match = useMatches().at(-1);
  const heading = (match?.handle as RouteHandle | undefined)?.heading;
  const page = typeof heading === "function" ? heading(match!.params) : heading;
  const admin = isAdmin(useAppSelector(selectAccount));
  const guard = useRouteLoaderData("root") as GuardData | undefined;
  const location = useLocation();
  const navigate = useNavigate();

  // Any 401 after the guard let us in: the session ended, so sign in again
  // and come back here. This layout only mounts on signed-in pages.
  useEffect(() => {
    const onSessionCleared = () => {
      if (isVerifyingSession()) return;
      void navigate(loginPath(location.pathname + location.search + location.hash), {
        replace: true,
      });
    };
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared);
  }, [location, navigate]);

  return (
    <div className="app-shell">
      <AppSidebar
        isAdmin={admin}
        showTools={showTools}
        showQueryHistory={showQueryHistory}
        onToggleTools={() => setShowTools((value) => !value)}
        onToggleQueryHistory={() => setShowQueryHistory((value) => !value)}
      />
      <main className="workspace" aria-label="Agentic Search workspace">
        {page && (
          <div className="page-intro min-w-0">
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </div>
        )}

        {guard?.error && (
          <div className="error-banner" role="alert">
            {guard.error}
          </div>
        )}

        {/* Both panels call admin-only endpoints. */}
        {admin && showTools && <ToolAdminPanel />}

        {admin && showQueryHistory && <QueryHistoryPanel />}

        <Outlet />
      </main>
    </div>
  );
}
