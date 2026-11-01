import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router";
import type { Route } from "../config/routes";

export function NavLink({
  to,
  className,
  children,
}: {
  to: Route;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) => `${className ?? ""}${isActive ? " active" : ""}`.trim()}
    >
      {children}
    </RouterNavLink>
  );
}
