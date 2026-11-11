import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router";

export function NavLink({
  to,
  className,
  onClick,
  end,
  children,
}: {
  to: string;
  className?: string;
  onClick?: () => void;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `${className ?? ""}${isActive ? " active" : ""}`.trim()}
    >
      {children}
    </RouterNavLink>
  );
}
