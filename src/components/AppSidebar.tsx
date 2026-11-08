import { useState } from "react";
import {
  Bot,
  History,
  LayoutGrid,
  MessagesSquare,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { Link } from "react-router";
import { NavLink } from "./NavLink";
import { SignOutButton } from "./SignOutButton";
import { routePath } from "../config/routes";
import { useAppSelector } from "../store";
import { selectProfile } from "../store/account";

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      { to: routePath("space-apps-list"), label: "Apps", icon: LayoutGrid },
      { to: routePath("space-apps-detail", { app_id: "assist" }), label: "Assistant", icon: Bot },
      { to: routePath("space-apps-detail", { app_id: "search" }), label: "Search", icon: Search },
      {
        to: routePath("space-apps-detail", { app_id: "chat" }),
        label: "Chat",
        icon: MessagesSquare,
      },
    ],
  },
  {
    label: "Explore",
    items: [
      { to: routePath("space-apps-detail", { app_id: "tools" }), label: "Tools", icon: Wrench },
    ],
  },
];

type AppSidebarProps = {
  isAdmin: boolean;
  showTools: boolean;
  showQueryHistory: boolean;
  isLoadingAccount?: boolean;
  onToggleTools: () => void;
  onToggleQueryHistory: () => void;
};

/** Persistent navigation and account footer, shared by all signed-in pages. */
export function AppSidebar({
  isAdmin,
  showTools,
  showQueryHistory,
  isLoadingAccount = false,
  onToggleTools,
  onToggleQueryHistory,
}: AppSidebarProps) {
  const profile = useAppSelector(selectProfile);
  const initial = profile.name.trim().charAt(0).toUpperCase() || "U";
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  return (
    <aside className="app-sidebar" aria-label="Common navigation">
      <div className="app-sidebar__inner">
        <Link to={routePath("space-apps-list")} className="app-sidebar__brand">
          <h1>Agentic Search</h1>
        </Link>
        <nav className="app-sidebar__surfaces" aria-label="Surfaces">
          {navigationGroups.map((group) => (
            <div className="app-sidebar__group" key={group.label}>
              <p className="app-sidebar__group-label">{group.label}</p>
              <div className="app-sidebar__links">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className="nav-link">
                    <Icon aria-hidden="true" size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          {isAdmin && (
            <div className="app-sidebar__group">
              <p className="app-sidebar__group-label">Administration</p>
              <div className="app-sidebar__links">
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
              </div>
            </div>
          )}
        </nav>
        <section className="app-sidebar__account" aria-label="Signed-in account">
          <div className="app-sidebar__identity">
            <span className="app-sidebar__avatar" role="img" aria-label="Your avatar">
              {profile.avatar && profile.avatar !== failedAvatar ? (
                <img src={profile.avatar} alt="" onError={() => setFailedAvatar(profile.avatar)} />
              ) : (
                initial
              )}
            </span>
            <div className="app-sidebar__profile">
              <p className="app-sidebar__name" title={profile.name}>
                {profile.name || "Your account"}
              </p>
              {profile.email && (
                <p className="app-sidebar__email" title={profile.email}>
                  {profile.email}
                </p>
              )}
              {isLoadingAccount && (
                <p className="app-sidebar__email" role="status">
                  Loading account…
                </p>
              )}
            </div>
          </div>
          <NavLink to={routePath("pages-account")} className="nav-link">
            <UserRound aria-hidden="true" size={18} />
            Account
          </NavLink>
          <SignOutButton />
        </section>
      </div>
    </aside>
  );
}
