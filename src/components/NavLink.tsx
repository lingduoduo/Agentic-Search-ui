import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router";

export function NavLink({
  to,
  className,
  onClick,
  children,
}: {
  to: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <RouterNavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `${className ?? ""}${isActive ? " active" : ""}`.trim()}
    >
      {children}
    </RouterNavLink>
  );
}
