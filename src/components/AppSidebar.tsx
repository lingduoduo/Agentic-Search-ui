import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronsUpDown,
  History,
  LayoutGrid,
  Library,
  MessageSquare,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { NavLink } from "./NavLink";
import { SignOutButton } from "./SignOutButton";
import { DEFAULT_ROUTE, routePath } from "../config/routes";
import { useAppSelector } from "../store";
import { selectProfile } from "../store/account";

/** Admin panels DefaultLayout shows above the page, toggled from the sidebar. */
export type PanelId = "tools" | "history";

type NavItem = { label: string; icon: LucideIcon } & (
  { to: string } | { panel: PanelId; title: string }
);

// Sidebar destinations and admin panels. Page links match exactly so the
// optional Apps directory does not also appear active inside Assistant.
const navigationGroups: { label: string; adminOnly?: boolean; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: DEFAULT_ROUTE, label: "Assistant", icon: MessageSquare },
      { to: routePath("space-apps-list"), label: "Apps", icon: LayoutGrid },
      { to: routePath("space-sources"), label: "Sources", icon: Library },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [
      { to: routePath("pages-admin"), label: "Admin", icon: ShieldCheck },
      { panel: "tools", label: "Manage tools", title: "Manage tools", icon: Settings2 },
      { panel: "history", label: "History", title: "Query history audit", icon: History },
    ],
  },
];

type AppSidebarProps = {
  isAdmin: boolean;
  panels: Record<PanelId, boolean>;
  onTogglePanel: (panel: PanelId) => void;
  isLoadingAccount?: boolean;
};

/** Persistent navigation and account menu, shared by all signed-in pages. */
export function AppSidebar({
  isAdmin,
  panels,
  onTogglePanel,
  isLoadingAccount = false,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar" aria-label="Common navigation">
      <div className="app-sidebar__inner">
        <Link to={DEFAULT_ROUTE} className="app-sidebar__brand">
          <h1>Agentic Search</h1>
        </Link>
        <nav className="app-sidebar__surfaces" aria-label="Surfaces">
          {navigationGroups
            .filter((group) => isAdmin || !group.adminOnly)
            .map((group) => (
              <div className="app-sidebar__group" key={group.label}>
                <p className="app-sidebar__group-label">{group.label}</p>
                <div className="app-sidebar__links">
                  {group.items.map(({ label, icon: Icon, ...item }) => {
                    const content = (
                      <>
                        <Icon aria-hidden="true" size={18} />
                        {label}
                      </>
                    );
                    if ("to" in item)
                      return (
                        <NavLink key={label} to={item.to} end className="nav-link">
                          {content}
                        </NavLink>
                      );
                    const pressed = panels[item.panel];
                    return (
                      <button
                        key={label}
                        className={`app-sidebar__button${pressed ? " active" : ""}`}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => onTogglePanel(item.panel)}
                        title={item.title}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </nav>
        <AccountMenu isLoadingAccount={isLoadingAccount} />
      </div>
    </aside>
  );
}

/** The identity card; clicking it opens Account and Sign out above it. */
function AccountMenu({ isLoadingAccount }: { isLoadingAccount: boolean }) {
  const profile = useAppSelector(selectProfile);
  const initial = profile.name.trim().charAt(0).toUpperCase() || "U";
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on a click outside, or on Escape (focus returns to the card).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <section ref={root} className="app-sidebar__account" aria-label="Signed-in account">
      {open && (
        <div id={menuId} className="app-sidebar__menu">
          <NavLink
            to={routePath("pages-account")}
            className="nav-link"
            onClick={() => setOpen(false)}
          >
            <UserRound aria-hidden="true" size={18} />
            Account
          </NavLink>
          <SignOutButton />
        </div>
      )}
      <button
        ref={trigger}
        type="button"
        className="app-sidebar__identity"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-sidebar__avatar" role="img" aria-label="Your avatar">
          {profile.avatar && profile.avatar !== failedAvatar ? (
            <img src={profile.avatar} alt="" onError={() => setFailedAvatar(profile.avatar)} />
          ) : (
            initial
          )}
        </span>
        <span className="app-sidebar__profile">
          <span className="app-sidebar__name" title={profile.name}>
            {profile.name || "Your account"}
          </span>
          {profile.email && (
            <span className="app-sidebar__email" title={profile.email}>
              {profile.email}
            </span>
          )}
        </span>
        <ChevronsUpDown aria-hidden="true" size={16} className="app-sidebar__chevron" />
      </button>
      {isLoadingAccount && (
        <p className="app-sidebar__email" role="status">
          Loading account…
        </p>
      )}
    </section>
  );
}
