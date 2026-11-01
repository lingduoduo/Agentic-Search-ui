import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import {
  getAdminSummary,
  getAnalyticsByFlow,
  getAnalyticsByLLM,
  getAnalyticsByPersona,
} from "../services/api";
import { AdminOverview } from "../components/AdminOverview";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import { QueryHistoryPanel } from "../components/QueryHistoryPanel";
import { ToolAdminPanel } from "../components/ToolAdminPanel";
import { useCanonicalRoute } from "../routes";
import { AppSidebar } from "../components/AppSidebar";
import type { AdminSurfaceSummary, BreakdownAnalytics } from "../interfaces";

export function App() {
  const [adminSummary, setAdminSummary] = useState<AdminSurfaceSummary | null>(null);
  const [analyticsByLLM, setAnalyticsByLLM] = useState<BreakdownAnalytics | null>(null);
  const [analyticsByPersona, setAnalyticsByPersona] = useState<BreakdownAnalytics | null>(null);
  const [analyticsByFlow, setAnalyticsByFlow] = useState<BreakdownAnalytics | null>(null);
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const route = useCanonicalRoute();

  useEffect(() => {
    getAdminSummary()
      .then(setAdminSummary)
      .catch(() => undefined);
    getAnalyticsByLLM()
      .then(setAnalyticsByLLM)
      .catch(() => undefined);
    getAnalyticsByPersona()
      .then(setAnalyticsByPersona)
      .catch(() => undefined);
    getAnalyticsByFlow()
      .then(setAnalyticsByFlow)
      .catch(() => undefined);
  }, []);

  const page = {
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
  }[route];

  return (
    <div className="app-shell">
      <AppSidebar
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

        {showTools && <ToolAdminPanel />}

        {showQueryHistory && <QueryHistoryPanel />}

        <Outlet />

        {(adminSummary || analyticsByLLM || analyticsByPersona || analyticsByFlow) && (
          <details className="workspace-insights">
            <summary>Admin and analytics</summary>
            {adminSummary && <AdminOverview summary={adminSummary} />}
            {(analyticsByLLM || analyticsByPersona || analyticsByFlow) && (
              <AnalyticsDashboard
                byLLM={analyticsByLLM}
                byPersona={analyticsByPersona}
                byFlow={analyticsByFlow}
              />
            )}
          </details>
        )}
      </main>
    </div>
  );
}
