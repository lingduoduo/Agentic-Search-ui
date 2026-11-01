import {
  Bot,
  History,
  LayoutGrid,
  LogOut,
  MessagesSquare,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { Form } from "react-router";
import { NavLink } from "./NavLink";
import { routePath } from "../config/routes";

type AppSidebarProps = {
  isAdmin: boolean;
  showTools: boolean;
  showQueryHistory: boolean;
  onToggleTools: () => void;
  onToggleQueryHistory: () => void;
};

/** Common navigation owned by the parent route, outside its page outlet. */
export function AppSidebar({
  isAdmin,
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
        <NavLink to={routePath("space-apps-list")} className="nav-link">
          <LayoutGrid aria-hidden="true" size={18} />
          Apps
        </NavLink>
        <NavLink to={routePath("space-apps-detail", { app_id: "assist" })} className="nav-link">
          <Bot aria-hidden="true" size={18} />
          Assistant
        </NavLink>
        <NavLink to={routePath("space-apps-detail", { app_id: "search" })} className="nav-link">
          <Search aria-hidden="true" size={18} />
          Search
        </NavLink>
        <NavLink to={routePath("space-apps-detail", { app_id: "chat" })} className="nav-link">
          <MessagesSquare aria-hidden="true" size={18} />
          Chat
        </NavLink>
        <NavLink to={routePath("space-apps-detail", { app_id: "tools" })} className="nav-link">
          <Wrench aria-hidden="true" size={18} />
          Tools
        </NavLink>
      </nav>
      <div className="app-sidebar__actions">
        {isAdmin && (
          <>
            <NavLink to={routePath("pages-admin")} className="nav-link">
              <ShieldCheck aria-hidden="true" size={18} />
              Admin
            </NavLink>
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
          </>
        )}
        <NavLink to={routePath("pages-account")} className="nav-link">
          <UserRound aria-hidden="true" size={18} />
          Account
        </NavLink>
        <Form method="post" action="/logout">
          <button className="app-sidebar__button" type="submit">
            <LogOut aria-hidden="true" size={18} />
            Sign out
          </button>
        </Form>
      </div>
    </aside>
  );
}
