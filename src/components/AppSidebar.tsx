import { Bot, History, MessagesSquare, Search, Settings2, Wrench } from "lucide-react";
import { NavLink } from "./NavLink";

type AppSidebarProps = {
  showTools: boolean;
  showQueryHistory: boolean;
  onToggleTools: () => void;
  onToggleQueryHistory: () => void;
};

/** Common navigation owned by the parent route, outside its page outlet. */
export function AppSidebar({
  showTools,
  showQueryHistory,
  onToggleTools,
  onToggleQueryHistory,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar" aria-label="Common navigation">
      <div className="app-sidebar__brand">
        <h1>Agentic Search</h1>
      </div>
      <nav className="app-sidebar__surfaces" aria-label="Surfaces">
        <NavLink to="/assist" className="nav-link">
          <Bot aria-hidden="true" size={18} />
          Assistant
        </NavLink>
        <NavLink to="/search" className="nav-link">
          <Search aria-hidden="true" size={18} />
          Search
        </NavLink>
        <NavLink to="/chat" className="nav-link">
          <MessagesSquare aria-hidden="true" size={18} />
          Chat
        </NavLink>
        <NavLink to="/tools" className="nav-link">
          <Wrench aria-hidden="true" size={18} />
          Tools
        </NavLink>
      </nav>
      <div className="app-sidebar__actions">
        <button
          className={`app-sidebar__button${showTools ? " active" : ""}`}
          type="button"
          aria-pressed={showTools}
          onClick={onToggleTools}
          title="Manage tools"
        >
          <Settings2 aria-hidden="true" size={18} />
          Manage tools
        </button>
        <button
          className={`app-sidebar__button${showQueryHistory ? " active" : ""}`}
          type="button"
          aria-pressed={showQueryHistory}
          onClick={onToggleQueryHistory}
          title="Query history audit"
        >
          <History aria-hidden="true" size={18} />
          History
        </button>
      </div>
    </aside>
  );
}
