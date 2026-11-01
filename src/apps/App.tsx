import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useRouteLoaderData } from "react-router";
import { QueryHistoryPanel } from "../components/QueryHistoryPanel";
import { ToolAdminPanel } from "../components/ToolAdminPanel";
import { useCanonicalRoute } from "../routes";
import { AppSidebar } from "../components/AppSidebar";
import { isAdmin, isVerifyingSession, loginPath } from "../auth/session";
import type { GuardData } from "../auth/session";
import { SESSION_CLEARED_EVENT } from "../config/session";
import { useAccount } from "../store/account";

export function App() {
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const route = useCanonicalRoute();
  const admin = isAdmin(useAccount());
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

  const page = {
    "/home": { title: "Home", description: "Pick a workspace to get started." },
    "/assist": {
      title: "Assistant",
      description: "Ask a question, search your sources, and follow the answer trail.",
    },
    "/search": {
      title: "Search",
      description: "Find relevant documents and explore the sources behind each result.",
    },
    "/chat": { title: "Chat", description: "Start a conversation with your model." },
    "/tools": {
      title: "Tools",
      description: "Ask the tool agent to complete a task and inspect its results.",
    },
    "/account": { title: "Account", description: "Your sign-in identity and access." },
    "/admin": {
      title: "Admin",
      description: "Operational health and usage analytics across the deployment.",
    },
  }[route];

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
        <div className="page-intro min-w-0">
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>

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
