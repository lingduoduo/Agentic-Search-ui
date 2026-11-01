import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router";

export function NavLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RouterNavLink
      to={to}
      end
      className={({ isActive }) => `${className ?? ""}${isActive ? " active" : ""}`.trim()}
    >
      {children}
    </RouterNavLink>
  );
}
