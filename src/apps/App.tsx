import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import {
  getAdminSummary,
  getAnalyticsByFlow,
  getAnalyticsByLLM,
  getAnalyticsByPersona,
} from "../services/api";
import { AdminOverview } from "../components/AdminOverview";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import { ChatView } from "../pages/ChatView";
import { QueryHistoryPanel } from "../components/QueryHistoryPanel";
import { SearchView } from "../pages/SearchView";
import { ToolAgentView } from "../pages/ToolAgentView";
import { ToolAdminPanel } from "../components/ToolAdminPanel";
import { AssistPage } from "../pages/AssistPage";
import { NavLink, useCanonicalRoute } from "../routes";
import type { AdminSurfaceSummary, BreakdownAnalytics } from "../interfaces";

export function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

function AppLayout() {
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
      <header className="topbar">
        <div className="header-navigation">
          <div className="brand">
            <h1>Agentic Search</h1>
          </div>
          <nav className="surface-nav" aria-label="Surfaces">
            <NavLink to="/assist" className="nav-link">
              Assistant
            </NavLink>
            <NavLink to="/search" className="nav-link">
              Search
            </NavLink>
            <NavLink to="/chat" className="nav-link">
              Chat
            </NavLink>
            <NavLink to="/tools" className="nav-link">
              Tools
            </NavLink>
          </nav>
        </div>
        <div className="topbar-actions">
          <button
            className={`icon-button${showTools ? " active" : ""}`}
            type="button"
            onClick={() => setShowTools((v) => !v)}
            title="Manage tools"
          >
            <span>Manage tools</span>
          </button>
          <button
            className={`icon-button${showQueryHistory ? " active" : ""}`}
            type="button"
            onClick={() => setShowQueryHistory((v) => !v)}
            title="Query history audit"
          >
            <span>History</span>
          </button>
        </div>
      </header>
      <main className="workspace" aria-label="Agentic Search workspace">
        <div className="page-intro min-w-0">
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>

        {showTools && <ToolAdminPanel />}

        {showQueryHistory && <QueryHistoryPanel />}

        <Routes>
          <Route path="/assist" element={<AssistPage />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/tools" element={<ToolAgentView />} />
          <Route path="*" element={<AssistPage />} />
        </Routes>

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
