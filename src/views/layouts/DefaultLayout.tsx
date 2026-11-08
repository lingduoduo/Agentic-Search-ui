import { useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
  useRouteLoaderData,
  useRevalidator,
} from "react-router";
import { QueryHistoryPanel } from "../../components/QueryHistoryPanel";
import { ToolAdminPanel } from "../../components/ToolAdminPanel";
import type { RouteHandle } from "../../config/routes";
import { AppSidebar } from "../../components/AppSidebar";
import type { PanelId } from "../../components/AppSidebar";
import { isAdmin, isVerifyingSession, loginPath } from "../auth/session";
import type { GuardData } from "../auth/session";
import { SESSION_CLEARED_EVENT } from "../../config/session";
import { selectAccount } from "../../store/account";
import { useAppSelector } from "../../store";

/** Left sidebar plus the page heading; the page renders in the Outlet. */
export function DefaultLayout() {
  const [panels, setPanels] = useState<Record<PanelId, boolean>>({ tools: false, history: false });
  const match = useMatches().at(-1);
  const heading = (match?.handle as RouteHandle | undefined)?.heading;
  const page = typeof heading === "function" ? heading(match!.params) : heading;
  const admin = isAdmin(useAppSelector(selectAccount));
  const guard = useRouteLoaderData("root") as GuardData | undefined;
  const revalidator = useRevalidator();
  const loadingAccount = revalidator.state === "loading";
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
        isLoadingAccount={loadingAccount && !!guard?.error}
        panels={panels}
        onTogglePanel={(panel) => setPanels((open) => ({ ...open, [panel]: !open[panel] }))}
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
            <span>{guard.error}</span>
            <button
              type="button"
              className="account-retry"
              aria-label="Retry loading account"
              disabled={loadingAccount}
              onClick={() => void revalidator.revalidate()}
            >
              {loadingAccount ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {/* Both panels call admin-only endpoints. */}
        {admin && panels.tools && <ToolAdminPanel />}

        {admin && panels.history && <QueryHistoryPanel />}

        <Outlet />
      </main>
    </div>
  );
}
